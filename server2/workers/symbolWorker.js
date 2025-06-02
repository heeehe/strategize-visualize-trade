// symbolWorker.js (with capital check and worker termination on zero capital)
const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const technicalIndicators = require('technicalindicators');
const { KiteConnect } = require('kiteconnect');
const config = require('../config');
const dayjs = require('dayjs'); // npm install dayjs

const kc = new KiteConnect({
  api_key: config.zerodha.apiKey,
});
kc.setAccessToken(config.zerodha.accessToken);

class Bar {
  constructor(date, open, high, low, close, volume) {
    this.date = date;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
  }
}

class DivergenceStrategy {
  constructor(sector, initialCapital) {
    this.bars = [];
    this.rsiHistory = [];
    this.closeHistory = [];
    this.activeTrades = {}; // symbol → { entryPrice, trailHigh, atrAtEntry }
    this.sector = sector;
    this.capital = initialCapital;
    this.isLiveMode = false; // Add this flag
  }

  computeRSI(period = 14) {
    if (this.closeHistory.length < period + 1) return null;
    return technicalIndicators.RSI.calculate({ values: this.closeHistory.slice(-period - 1), period }).slice(-1)[0];
  }

  computeATR(period = 14) {
    if (this.bars.length < period + 1) return null;
    const highs = this.bars.slice(-period - 1).map(b => b.high);
    const lows = this.bars.slice(-period - 1).map(b => b.low);
    const closes = this.bars.slice(-period - 1).map(b => b.close);
    return technicalIndicators.ATR.calculate({ high: highs, low: lows, close: closes, period }).slice(-1)[0];
  }

  getATRSettings() {
    const atrSettings = {
      'Banking & Financial Services': { period: 14, multiplier: 2.0, rsiExit: true },
      'Energy & Power': { period: 10, multiplier: 2.5, rsiExit: true },
      'Infrastructure & Engineering': { period: 14, multiplier: 1.5, rsiExit: false },
      'Chemicals & Specialty Materials': { period: 14, multiplier: 1.2, rsiExit: false },
      'Iron & Steel': { period: 14, multiplier: 2.0, rsiExit: false },
      'Textiles & Manufacturing': { period: 14, multiplier: 1.5, rsiExit: false },
      'Logistics & Real Estate': { period: 14, multiplier: 2.0, rsiExit: true }
    };
    return atrSettings[this.sector] || { period: 14, multiplier: 2.0, rsiExit: false };
  }

  onNewBar(bar) {
    this.bars.push(bar);
    this.closeHistory.push(bar.close);
    if (this.bars.length > 100) this.bars.shift();
    if (this.closeHistory.length > 100) this.closeHistory.shift();

    const atr = this.computeATR(this.getATRSettings().period);
    const rsi = this.computeRSI();
    if (!atr || !rsi) return;
    this.rsiHistory.push(rsi);
    if (this.rsiHistory.length > 100) this.rsiHistory.shift();

    const trade = this.activeTrades[bar.symbol];
    if (trade) {
      const { entryPrice, trailHigh, atrAtEntry } = trade;
      const newTrailHigh = Math.max(trailHigh, bar.close);
      const currentGain = (bar.close - entryPrice) / entryPrice * 100;

      const exitLevel = entryPrice + (this.getATRSettings().multiplier * atrAtEntry);
      const shouldExit =
        (bar.close <= exitLevel && (!this.getATRSettings().rsiExit || rsi < 55)) ||
        currentGain >= 15 ||
        bar.close <= entryPrice * 1.05;

      if (shouldExit) {
        parentPort.postMessage({ symbol: bar.symbol, date: bar.date, signal: 'Exit (trailing strategy)' });
        delete this.activeTrades[bar.symbol];
        this.capital += bar.close;
        if (this.capital <= 0) {
          parentPort.postMessage({ type: 'stop-all', reason: 'Capital depleted' });
        }
        return;
      }
      trade.trailHigh = newTrailHigh;
    }

    const signal = this.detectDivergence();
    if (signal && !this.activeTrades[bar.symbol]) {
      if (this.capital >= bar.close) {
        this.activeTrades[bar.symbol] = {
          entryPrice: bar.close,
          trailHigh: bar.close,
          atrAtEntry: atr
        };
        this.capital -= bar.close;
        // Only send buy signals if in live mode
        if (this.isLiveMode) {
          parentPort.postMessage({ symbol: bar.symbol, date: bar.date, signal });
        }
      } else {
        if (this.isLiveMode) {
          parentPort.postMessage({ symbol: bar.symbol, date: bar.date, signal: 'Buy Signal (Insufficient Capital)' });
        }
      }
    }
    else{
      if (this.isLiveMode) {
        console.log(`[${bar.symbol}] No divergence detected at ${bar.date}`);
        parentPort.postMessage({ symbol: bar.symbol, date: bar.date, signal: 'No Divergence Detected' });
      }
    }
  }

  detectDivergence() {
    if (this.bars.length < 20 || this.rsiHistory.length < 20) return null;
    const recent = this.bars.length - 1;
    const past = recent - 10;

    const priceNow = this.bars[recent].close;
    const pricePrev = this.bars[past].close;
    const highNow = this.bars[recent].high;
    const highPrev = this.bars[past].high;
    const lowNow = this.bars[recent].low;
    const lowPrev = this.bars[past].low;

    const rsiNow = this.rsiHistory[this.rsiHistory.length - 1];
    const rsiPrev = this.rsiHistory[this.rsiHistory.length - 11];

    const isDoubleTop = Math.abs(highNow - highPrev) / highPrev < 0.01;
    const isDoubleBottom = Math.abs(lowNow - lowPrev) / lowPrev < 0.01;
    console.log(`[${bar.symbol}] Checking divergence at ${bar.date} - RSI: ${rsi}`);
    

    if (highNow > highPrev && rsiNow < rsiPrev) return 'Bearish Divergence';
    if (lowNow < lowPrev && rsiNow > rsiPrev) return 'Bullish Divergence';
    if (isDoubleTop && rsiNow < rsiPrev) return 'Bearish Double Top Divergence';
    if (isDoubleBottom && rsiNow > rsiPrev) return 'Bullish Double Bottom Divergence';
    if (priceNow > pricePrev && rsiNow <= rsiPrev) return 'Weak Bearish Divergence';
    if (priceNow < pricePrev && rsiNow >= rsiPrev) return 'Weak Bullish Divergence';
    return null;
  }
}

async function loadHistoricalBars(symbol) {
  let instrumentToken = null;
  for (const sector of Object.values(config.sectorStocks)) {
    if (sector[symbol]) {
      instrumentToken = sector[symbol];
      break;
    }
  }
  if (!instrumentToken) throw new Error(`No token for ${symbol}`);

  // Dates in YYYY-MM-DD
  const to = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const from = dayjs().subtract(30, 'day').format('YYYY-MM-DD'); // last 30 days

  const api_key = config.zerodha.apiKey;
  const access_token = config.zerodha.accessToken;
  const interval = 'day';

  const url = `https://api.kite.trade/instruments/historical/${instrumentToken}/${interval}?from=${from}&to=${to}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${api_key}:${access_token}`
      }
    });
    const candles = response.data.data.candles;
    console.log(`Loaded ${candles.length} historical bars for ${symbol}`);
    return candles.map(c => new Bar(
      c[0].slice(0, 10), // date string
      c[1], // open
      c[2], // high
      c[3], // low
      c[4], // close
      c[5]  // volume
    ));
  } catch (err) {
    console.error(`Error loading historical bars for ${symbol}:`, err.response?.data || err.message);
    return [];
  }
}

async function fetchAndRunDailyBar(symbol, strategy) {
  try {
    const bar = await getLatestLiveBar(symbol);
    bar.symbol = symbol;
    strategy.onNewBar(bar);
    console.log(`Processed live bar for ${symbol}:`, bar);
  } catch (err) {
    console.error(`Error fetching live bar for ${symbol}:`, err);
  }
  setTimeout(() => fetchAndRunDailyBar(symbol, strategy), 1000 * 60 * 60 * 24);
}

async function getLatestLiveBar(symbol) {
  let instrumentToken = null;
  for (const sector of Object.values(config.sectorStocks)) {
    if (sector[symbol]) {
      instrumentToken = sector[symbol];
      break;
    }
  }
  if (!instrumentToken) throw new Error(`No token for ${symbol}`);

  try {
    const quote = await kc.getQuote([instrumentToken]);
    const q = quote[instrumentToken];
    if (!q || !q.ohlc) throw new Error('No quote data');
    const ohlc = q.ohlc;
    const last = q.last_price;
    const volume = q.volume;
    return new Bar(new Date().toISOString().slice(0, 10), ohlc.open, ohlc.high, ohlc.low, last, volume);
  } catch (err) {
    console.error(`Error fetching live bar for ${symbol}:`, err.message);
    throw err;
  }
}

(async () => {
  const symbol = workerData.symbol;
  const sector = workerData.sector;
  const capital = workerData.maxCapital;
  const strategy = new DivergenceStrategy(sector, capital);

  // Process historical bars (isLiveMode = false)
  strategy.isLiveMode = false;
  const history = await loadHistoricalBars(symbol);
  for (const bar of history) {
    bar.symbol = symbol;
    strategy.onNewBar(bar);
  }

  // Process live bars (isLiveMode = true)
  strategy.isLiveMode = true;
  console.log(`Starting live processing for ${symbol} in sector ${sector}`);
  fetchAndRunDailyBar(symbol, strategy);
})();

