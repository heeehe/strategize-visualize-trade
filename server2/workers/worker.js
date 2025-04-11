const axios = require("axios");
const { parentPort, workerData } = require("worker_threads");

// Technical Indicators
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
};

const calculateRSI = (prices, period = 14) => {
  const rsi = [];
  if (prices.length < period + 1) return new Array(prices.length).fill(50);

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average calculation
  for (let i = 1; i <= period; i++) {
    const delta = prices[i] - prices[i - 1];
    avgGain += Math.max(delta, 0);
    avgLoss += Math.max(-delta, 0);
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill initial period
  rsi.push(...new Array(period).fill(50));
  
  // First RSI value
  const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + rs)));

  // Subsequent values
  for (let i = period + 1; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    const gain = Math.max(delta, 0);
    const loss = Math.max(-delta, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
};

const calculateATR = (high, low, close, period = 14) => {
  const tr = [high[0] - low[0]];
  for (let i = 1; i < high.length; i++) {
    tr.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    ));
  }
  return calculateEMA(tr, period);
};

// Unified Strategy Execution
const runUnifiedStrategy = (allData, params, initialCapital) => {
  let capital = initialCapital;
  let positions = {};
  const trades = [];
  const equityCurve = [{ date: allData[0].date, value: capital }];
  
  // Precompute indicators for all stocks
  const preparedData = allData.map(stockData => {
    const closes = stockData.data.map(d => d.price);
    const highs = stockData.data.map(d => d.high);
    const lows = stockData.data.map(d => d.low);
    
    return {
      symbol: stockData.symbol,
      data: stockData.data,
      rsi: calculateRSI(closes),
      macd: {
        macdLine: calculateEMA(closes, 12).map((ema12, i) => ema12 - calculateEMA(closes, 26)[i]),
        signalLine: calculateEMA(calculateEMA(closes, 12).map((ema12, i) => ema12 - calculateEMA(closes, 26)[i]), 9)
      },
      atr: calculateATR(highs, lows, closes),
      vwap: (() => {
        let cumulativeTypicalVolume = 0;
        let cumulativeVolume = 0;
        return stockData.data.map((d) => {
          const typical = (d.high + d.low + d.price) / 3;
          cumulativeTypicalVolume += typical * d.volume;
          cumulativeVolume += d.volume;
          return cumulativeTypicalVolume / cumulativeVolume;
        });
      })()
    };
  });

  for (let i = 40; i < preparedData[0].data.length; i++) {
    const currentDate = preparedData[0].data[i].date;
    let bestTrade = null;
    let maxScore = -Infinity;

    // Evaluate all stocks for potential trades
    preparedData.forEach(stock => {
      const current = stock.data[i];
      const position = positions[stock.symbol];
      
      // Sell conditions
      if (position) {
        const currentProfit = (current.price - position.entryPrice) / position.entryPrice;
        const stopLoss = position.entryPrice * (1 - params.stopLossPercent);
        const takeProfit = position.entryPrice * (1 + params.takeProfitPercent);
        const currentRSI = stock.rsi[i];
        const macdCrossBelow = stock.macd.macdLine[i] < stock.macd.signalLine[i];
        const priceBelowVWAP = current.price < stock.vwap[i];
        const technicalSell = currentRSI > 60 && macdCrossBelow;
        
        if (current.price <= stopLoss || current.price >= takeProfit || technicalSell || priceBelowVWAP) {
          const profit = (current.price - position.entryPrice) * position.shares;
          capital += position.shares * current.price;
          let reason;
          if (current.price <= stopLoss) reason = "stop-loss";
          else if (current.price >= takeProfit) reason = "take-profit";
          else if (technicalSell) reason = "technical-sell";
          else reason = "price-below-vwap";
          trades.push({
            date: currentDate,
            type: "sell",
            symbol: stock.symbol,
            price: current.price,
            profit,
            reason
          });
          delete positions[stock.symbol];
        }
      }

      // Buy conditions
      if (!position && capital > 0) {
        const rsi = stock.rsi[i];
        const macdCross = stock.macd.macdLine[i] > stock.macd.signalLine[i];
        const priceAboveVWAP = current.price > stock.vwap[i];

        if (rsi < 40 && macdCross && priceAboveVWAP) {
          const riskAmount = capital * params.riskPerTrade;
          const maxLossPrice = current.price * (1 - params.stopLossPercent);
          const shares = Math.floor(riskAmount / (current.price - maxLossPrice));
          
          if (shares > 0) {
            const score = stock.atr[i] / current.price * (params.riskTolerance === "high" ? 2 : 1);
            if (score > maxScore) {
              maxScore = score;
              bestTrade = {
                symbol: stock.symbol,
                price: current.price,
                shares,
                riskAmount
              };
            }
          }
        }
      }
    });

    // Execute best trade
    if (bestTrade && capital >= bestTrade.riskAmount) {
      capital -= bestTrade.shares * bestTrade.price;
      positions[bestTrade.symbol] = {
        shares: bestTrade.shares,
        entryPrice: bestTrade.price,
        entryDate: currentDate
      };
      trades.push({
        date: currentDate,
        type: "buy",
        symbol: bestTrade.symbol,
        price: bestTrade.price,
        shares: bestTrade.shares
      });
    }

    // Update equity curve
    const positionsValue = Object.values(positions).reduce((sum, pos) => 
      sum + (pos.shares * preparedData.find(s => s.symbol === pos.symbol).data[i].price), 0);
    equityCurve.push({ date: currentDate, value: capital + positionsValue });
  }

  // Close all remaining positions
  Object.entries(positions).forEach(([symbol, position]) => {
    const lastPrice = preparedData.find(s => s.symbol === symbol).data.slice(-1)[0].price;
    capital += position.shares * lastPrice;
    trades.push({
      date: preparedData[0].data.slice(-1)[0].date,
      type: "sell",
      symbol,
      price: lastPrice,
      profit: (lastPrice - position.entryPrice) * position.shares,
      reason: "end-of-period"
    });
  });

  // Calculate performance metrics
  const finalCapital = capital;
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  
  let peak = initialCapital;
  let maxDrawdown = 0;
  equityCurve.forEach(({ value }) => {
    if (value > peak) peak = value;
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  return {
    initialCapital,
    finalCapital,
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    trades,
    equityCurve
  };
};

// Main worker execution
(async () => {
  try {
    const { symbols, params, startDate, endDate, initialCapital } = workerData;
    
    // Fetch all historical data
    const allData = await Promise.all(symbols.map(async symbol => {
      const data = await getHistoricalData(symbol, startDate, endDate);
      return { symbol, data: data.filter(d => d.price !== null) };
    }));

    // Align data dates and filter incomplete data
    const dates = allData[0].data.map(d => d.date);
    const alignedData = allData.map(stock => ({
      ...stock,
      data: dates.map(date => 
        stock.data.find(d => d.date === date) || { date, price: null, high: null, low: null, volume: null }
      ).filter(d => d.price !== null)
    })).filter(stock => stock.data.length > 0);

    const result = runUnifiedStrategy(alignedData, params, initialCapital);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
})();

// Historical data fetch
async function getHistoricalData(symbol, startDate, endDate) {
  try {
    // Calculate time difference to determine optimal range
    const daysDifference = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const interval = daysDifference <= 7 ? '1m' : daysDifference <= 60 ? '5m' : '1d';

    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=${interval}`;

    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const result = response.data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];
    
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      price: quote.close[i],
      high: quote.high[i],
      low: quote.low[i],
      volume: quote.volume[i]
    })).filter(d => d.price !== null);

  } catch (error) {
    throw new Error(`Failed to fetch ${symbol}: ${error.response?.data?.error?.description || error.message}`);
  }
}