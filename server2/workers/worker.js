// dataFetchWorker.js
const { parentPort, workerData } = require("worker_threads");
const { getHistoricalRates } = require("dukascopy-node");

(async () => {
  try {
    const { symbols, startDate, endDate } = workerData;

    const allData = await Promise.all(
      symbols.map(async symbolId => {
        const raw = await getHistoricalRates({
          instrument: symbolId,
          dates: { from: new Date(startDate), to: new Date(endDate) },
          timeframe: 'm5',
          format: 'array'
        });
        if (!raw || raw.length === 0) return null;

        const timestamps = raw.map(d => new Date(d[0]).getTime());
        const opens = raw.map(d => d[1]);
        const highs = raw.map(d => d[2]);
        const lows = raw.map(d => d[3]);
        const closes = raw.map(d => d[4]);
        const volumes = raw.map(d => d[5] || 0);

        return { symbol: symbolId, timestamps, opens, highs, lows, closes, volumes };
      })
    );

    const filteredData = allData.filter(d => d !== null);

    // Each candle = 6 fields
    let totalPoints = filteredData.reduce((acc, stock) => acc + stock.timestamps.length, 0);
    const fieldsPerCandle = 6;

    const buffer = new SharedArrayBuffer(totalPoints * fieldsPerCandle * Float64Array.BYTES_PER_ELEMENT);
    const view = new Float64Array(buffer);

    let offset = 0;
    for (const stock of filteredData) {
      for (let i = 0; i < stock.timestamps.length; i++) {
        view[offset++] = stock.timestamps[i]; // 0
        view[offset++] = stock.opens[i];      // 1
        view[offset++] = stock.highs[i];      // 2
        view[offset++] = stock.lows[i];       // 3
        view[offset++] = stock.closes[i];     // 4
        view[offset++] = stock.volumes[i];    // 5
      }
    }

    parentPort.postMessage({
      symbols: filteredData.map(s => s.symbol),
      pointsPerSymbol: filteredData.map(s => s.timestamps.length),
      buffer
    });

  } catch (err) {
    console.error("Worker error:", err);
    parentPort.postMessage({ error: err.message, stack: err.stack });
  }
})();

// const axios = require("axios");
// const { parentPort, workerData } = require("worker_threads");
// const technicalIndicators = require("technicalindicators");
// const dukascopy = require('dukascopy-node');
// const moment = require("moment");
// const { createStrategy } = require("../strategies");

// // Use technicalindicators library instead of tulind for calculations
// class TechnicalAnalysis {
//   static calculateEMA(prices, period) {
//     const ema = new technicalIndicators.EMA({
//       period,
//       values: prices
//     });
//     return ema.getResult();
//   }

//   static calculateRSI(prices, period = 14) {
//     const rsi = new technicalIndicators.RSI({
//       period,
//       values: prices
//     });
//     const result = rsi.getResult();
    
//     // Fill initial values that RSI doesn't calculate due to period requirements
//     return [...Array(prices.length - result.length).fill(50), ...result];
//   }

//   static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
//     const macd = new technicalIndicators.MACD({
//       values: prices,
//       fastPeriod,
//       slowPeriod,
//       signalPeriod,
//       SimpleMAOscillator: false,
//       SimpleMASignal: false
//     });
    
//     const result = macd.getResult();
    
//     // Restructure to match our expected format
//     const macdLine = [];
//     const signalLine = [];
//     const histogram = [];
    
//     result.forEach(item => {
//       macdLine.push(item.MACD);
//       signalLine.push(item.signal);
//       histogram.push(item.histogram);
//     });
    
//     // Pad beginning values to match original array length
//     const paddingLength = prices.length - result.length;
//     const padding = Array(paddingLength).fill(0);
    
//     return {
//       macdLine: [...padding, ...macdLine],
//       signalLine: [...padding, ...signalLine],
//       histogram: [...padding, ...histogram]
//     };
//   }

//   static calculateATR(high, low, close, period = 14) {
//     const atr = new technicalIndicators.ATR({
//       high,
//       low,
//       close,
//       period
//     });
    
//     const result = atr.getResult();
    
//     // Fill initial values that ATR doesn't calculate due to period requirements
//     const padding = Array(high.length - result.length).fill(null);
//     return [...padding, ...result];
//   }

//   static calculateVWAP(high, low, close, volume) {
//     // VWAP is not available in technicalindicators, implement manually
//     let cumulativeTypicalVolume = 0;
//     let cumulativeVolume = 0;
//     const vwap = [];
    
//     for (let i = 0; i < close.length; i++) {
//       const typicalPrice = (high[i] + low[i] + close[i]) / 3;
//       cumulativeTypicalVolume += typicalPrice * volume[i];
//       cumulativeVolume += volume[i];
//       vwap.push(cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : close[i]);
//     }
    
//     return vwap;
//   }
// }
// async function getHistoricalData(symbol, startDate, endDate) {
//   try {
//     const start = Math.floor(new Date(startDate).getTime() / 1000);
//     const end = Math.floor(new Date(endDate).getTime() / 1000);
    
//     const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;

//     const response = await axios.get(url, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
//         'Accept': 'application/json',
//         'Accept-Encoding': 'gzip, deflate, br',
//         'Connection': 'keep-alive',
//         'Referer': 'https://finance.yahoo.com/',
//         'Cookie': `A3=d=AQABBAG9m2YCEBbl2lUj6mXeJinOZ2lFEggFEgEBCAFQZ2YQZ2V_SLMA_eMBAAA&S=AQAAAJj59oVDdSoWjOPtKzD5R3o`
//       }
//     });

//     const chartResult = response.data.chart.result[0];
//     const quoteData = chartResult.indicators.quote[0];
//     const timestamps = chartResult.timestamp;

//     return timestamps.map((ts, index) => ({
//       date: new Date(ts * 1000).toISOString().split('T')[0],
//       price: quoteData.close[index],
//       high: quoteData.high[index],
//       low: quoteData.low[index],
//       open: quoteData.open[index],
//       volume: quoteData.volume[index] || 0
//     })).filter(item => item.price !== null);

//   } catch (error) {
//     console.error(`Yahoo Finance API error for ${symbol}:`, error);
//     throw new Error(`Failed to fetch data for ${symbol}: ${error.message}`);
//   }
// }
// // Backtesting engine
// class BacktestEngine {
//   constructor(initialCapital, params, strategyId ) {
//     this.initialCapital = initialCapital;
//     this.params = params;
//     this.capital = initialCapital;
//     this.positions = {};
//     this.trades = [];
//     this.equityCurve = [];
//     console.log("Calling createStrategy with strategyId:", strategyId);
//     this.strategy = createStrategy(strategyId, params);

//   }
  
//   async run(symbols, startDate, endDate) {
//     try {
//       // Fetch historical data
//       // Option 1: If it's in the same file
//       const allData = await fetchHistoricalData(symbols, startDate, endDate);
      
//       // Prepare data with technical indicators
//       const preparedData = this.prepareData(allData);
      
//       // Initialize equity curve with starting date
//       if (preparedData.length > 0 && preparedData[0].data.length > 0) {
//         this.equityCurve.push({
//           date: preparedData[0].data[0].date,
//           value: this.initialCapital
//         });
//       }
      
//       // Run trading logic
//       this.executeStrategy(preparedData);
      
//       // Close any remaining positions
//       this.closeAllPositions(preparedData);
      
//       // Calculate and return performance metrics
//       return this.calculatePerformance();
      
//     } catch (error) {
//       console.error("Backtest error:", error);
//       throw error;
//     }
//   }
  
//   // Fetch historical data for all symbols in the selected category
//   // This function can be modified to use different data sources as needed
  

//   alignDates(allData) {
//     // Create set of all dates
//     const allDates = new Set();
//     allData.forEach(stock => {
//       stock.data.forEach(d => allDates.add(d.date));
//     });
    
//     // Sort dates chronologically
//     const sortedDates = Array.from(allDates).sort();
    
//     // Create aligned data
//     return allData.map(stock => {
//       const alignedData = sortedDates.map(date => {
//         const dataPoint = stock.data.find(d => d.date === date);
//         return dataPoint || { 
//           date, 
//           price: null, 
//           high: null, 
//           low: null, 
//           volume: 0 
//         };
//       }).filter(d => d.price !== null); // Remove entries with no price
      
//       return {
//         symbol: stock.symbol,
//         data: alignedData
//       };
//     }).filter(stock => stock.data.length > 0); // Filter stocks with no usable data
//   }
  
//   prepareData(allData) {
//     return allData.map(stockData => {
//       const closes = stockData.data.map(d => d.price);
//       const highs = stockData.data.map(d => d.high || d.price);
//       const lows = stockData.data.map(d => d.low || d.price);
//       const volumes = stockData.data.map(d => d.volume || 0);
      
//       // Calculate indicators using the technical analysis library
//       return {
//         symbol: stockData.symbol,
//         data: stockData.data,
//         indicators: {
//           rsi: TechnicalAnalysis.calculateRSI(closes),
//           macd: TechnicalAnalysis.calculateMACD(closes),
//           atr: TechnicalAnalysis.calculateATR(highs, lows, closes),
//           vwap: TechnicalAnalysis.calculateVWAP(highs, lows, closes, volumes)
//         }
//       };
//     });
//   }
  
//   executeStrategy(preparedData) {
//     // Skip if no data
//     if (preparedData.length === 0 || preparedData[0].data.length === 0) {
//       console.log("entered null condition");
//       return;
//     }
    
//     const dataLength = preparedData[0].data.length;
    
//     // Main trading loop - start from bar 40 to allow indicators to warm up
//     for (let i = 0; i < dataLength; i++) {
//       const currentDate = preparedData[0].data[i].date;
      
//       // Process sell signals first
//       this.processSellSignals(preparedData, i);
      
//       // Then process buy signals
//       this.processBuySignals(preparedData, i);
      
//       // Update equity curve
//       this.updateEquity(currentDate, preparedData, i);
//     }
//   }
  
//   processSellSignals(preparedData, currentBar) {
//     Object.entries(this.positions).forEach(([symbol, position]) => {
//       const stock = preparedData.find(s => s.symbol === symbol);
//       if (!stock || currentBar >= stock.data.length) return;
      
//       // Get sell signal from strategy
//       const sellSignal = this.strategy.getSellSignal(position, stock, currentBar);
      
//       if (sellSignal) {
//         this.sellPosition(symbol, sellSignal.price, sellSignal.reason, sellSignal.date);
//       }
//     });
//   }
  
//   processBuySignals(preparedData, currentBar) {
//     if (this.capital <= 0) return; // Skip if no capital available
    
//     let bestTrade = null;
//     let maxScore = -Infinity;
    
//     preparedData.forEach(stock => {
//       // Skip if we already have a position in this stock
//       if (this.positions[stock.symbol]) return;
      
//       // Get buy signal from strategy
//       const buySignal = this.strategy.getBuySignal(stock, currentBar, this.capital);
      
//       if (buySignal) {
//         const score = this.strategy.calculateScore(stock, currentBar);
        
//         if (score > maxScore) {
//           maxScore = score;
//           bestTrade = {
//             symbol: stock.symbol,
//             price: buySignal.price,
//             shares: buySignal.shares,
//             date: buySignal.date,
//             reason: buySignal.reason
//           };
//         }
//       }
//     });
    
//     // Execute best trade if found
//     if (bestTrade) {
//       this.buyPosition(
//         bestTrade.symbol,
//         bestTrade.price,
//         bestTrade.shares,
//         bestTrade.date,
//         bestTrade.reason
//       );
//     }
//   }
  
//   buyPosition(symbol, price, shares, date, reason = "technical-buy") {
//     const cost = price * shares;
    
//     if (cost > this.capital) {
//       console.warn(`Insufficient capital to buy ${shares} shares of ${symbol}`);
//       return false;
//     }
    
//     this.capital -= cost;
    
//     this.positions[symbol] = {
//       shares,
//       entryPrice: price,
//       entryDate: date
//     };
    
//     this.trades.push({
//       date,
//       type: "buy",
//       symbol,
//       price,
//       shares,
//       reason
//     });
    
//     return true;
//   }
  
//   sellPosition(symbol, price, reason, date) {
//     const position = this.positions[symbol];
//     if (!position) return false;
    
//     const profit = (price - position.entryPrice) * position.shares;
//     this.capital += position.shares * price;
    
//     this.trades.push({
//       date,
//       type: "sell",
//       symbol,
//       price,
//       profit,
//       reason
//     });
    
//     delete this.positions[symbol];
//     return true;
//   }
  
//   updateEquity(date, stockData, currentBar) {
//     const positionsValue = Object.entries(this.positions).reduce((sum, [symbol, position]) => {
//       const stock = stockData.find(s => s.symbol === symbol);
//       if (!stock || currentBar >= stock.data.length) return sum;
      
//       return sum + (position.shares * stock.data[currentBar].price);
//     }, 0);
    
//     this.equityCurve.push({
//       date,
//       value: this.capital + positionsValue
//     });
//   }
  
//   closeAllPositions(preparedData) {
//     if (preparedData.length === 0 || preparedData[0].data.length === 0) {
//       return;
//     }
    
//     const lastBar = preparedData[0].data.length - 1;
//     const lastDate = preparedData[0].data[lastBar].date;
    
//     Object.keys(this.positions).forEach(symbol => {
//       const stock = preparedData.find(s => s.symbol === symbol);
//       if (!stock || stock.data.length === 0) return;
      
//       const lastPrice = stock.data[stock.data.length - 1].price;
//       this.sellPosition(symbol, lastPrice, "end-of-period", lastDate);
//     });
//   }
  
//   calculatePerformance() {
//     const finalCapital = this.capital;
//     const totalReturn = ((finalCapital - this.initialCapital) / this.initialCapital) * 100;
    
//     let peak = this.initialCapital;
//     let maxDrawdown = 0;
    
//     this.equityCurve.forEach(point => {
//       if (point.value > peak) peak = point.value;
//       const drawdown = ((peak - point.value) / peak) * 100;
//       if (drawdown > maxDrawdown) maxDrawdown = drawdown;
//     });
    
//     return {
//       initialCapital: this.initialCapital,
//       finalCapital,
//       totalReturn: parseFloat(totalReturn.toFixed(2)),
//       maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
//       trades: this.trades,
//       equityCurve: this.equityCurve
//     };
//   }
// }

// async function fetchHistoricalData(symbols, startDate, endDate) {
//   console.log(`Fetching data for ${symbols.length} symbols from ${startDate} to ${endDate}`);
  
//   try {
//     const allData = await Promise.all(
//       symbols.map(async symbolId => {
//         try {
//           const data = await dukascopy({
//             instrument: symbolId,
//             dates: {
//               from: new Date(startDate),
//               to: new Date(endDate),
//             },
//             timeframe: '5m', // You can change this to '1m', '1d', etc. based on your requirement
//             format: 'array' // returns data in plain JS array format
//           });
  
//           console.log(`Fetched ${data.length} data points for ${symbolId}`);
//           return { symbolId, data };
//         } catch (error) {
//           console.error(`Error fetching ${symbolId}: ${error.message}`);
//           return { symbolId, data: [] };
//         }
//       })
//     );

//     // Optional: Filter symbols with no data
//     const filtered = allData.filter(s => s.data.length > 0);

//     // You can add your alignDates logic here if needed
//     return filtered;

//   } catch (error) {
//     console.error("Error in data fetching:", error);
//     throw new Error(`Failed to fetch historical data: ${error.message}`);
//   }
// }

// // Main worker execution
// (async () => {
//   try {
//     const { 
//       symbols, 
//       params, 
//       startDate, 
//       endDate, 
//       initialCapital,
//       strategyId 
//     } = workerData;
    
    
//     console.log("Starting backtest with parameters:", {
//       symbols: symbols.length,
//       startDate,
//       endDate,
//       initialCapital,
//       params,
//       strategyId,
//       riskPerTrade: params.riskPerTrade,
//       stopLossPercent: params.stopLossPercent,
//       takeProfitPercent: params.takeProfitPercent
//     });
    
//     // Create and run backtest engine with specified strategy
//     const engine = new BacktestEngine(initialCapital, params, strategyId);
//     console.log("Backtest engine initialized.");
//     const result = await engine.run(symbols, startDate, endDate);
    
//     console.log("Backtest completed successfully:", {
//       finalCapital: result.finalCapital,
//       totalReturn: result.totalReturn,
//       trades: result.trades.length
//     });
    
//     // Send results back to main thread
//     parentPort.postMessage(result);
    
//   } catch (error) {
//     console.error("Backtest failed:", error);
//     parentPort.postMessage({
//       error: error.message,
//       stack: error.stack
//     });
//   }
// })();