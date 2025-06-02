const { zerodha, sectorStocks } = require('../config');
const { KiteTicker } = require('kiteconnect');
const { executeTrade } = require('./tradeController'); // Use generic trade executor

const ohlcvMap = {}; // { token: { open, high, low, close, volume, startTime } }
let buyPrice = null;
let position = null; // 'long' or null
let quantity = 1; // default

async function processTickToOHLCV(tick, intervalMs = 10000, stockInfo, maxCapital) {
  const token = tick.instrument_token;
  const now = Date.now();
  let ohlcv = ohlcvMap[token];

  // Use volume_traded if volume is undefined
  const volume = typeof tick.volume !== "undefined"
    ? tick.volume
    : (typeof tick.volume_traded !== "undefined" ? tick.volume_traded : 0);

  if (!ohlcv || now - ohlcv.startTime >= intervalMs) {
    // Log and reset previous bar if exists
    if (ohlcv) {
      console.log(`OHLCV (10s) for ${token}:`, ohlcv);
    }
    // Start new bar
    ohlcvMap[token] = {
      open: tick.last_price,
      high: tick.last_price,
      low: tick.last_price,
      close: tick.last_price,
      volume: volume,
      startTime: now
    };
  } else {
    // Update current bar
    ohlcv.high = Math.max(ohlcv.high, tick.last_price);
    ohlcv.low = Math.min(ohlcv.low, tick.last_price);
    ohlcv.close = tick.last_price;
    ohlcv.volume = volume;
  }

  // --- Simple intraday strategy: Buy if not in position, Sell if 1% profit ---
  try {
    // Calculate quantity based on maxCapital and current price
    quantity = Math.floor(Number(maxCapital) / tick.last_price) || 1;

    if (!position) {
      // Place a buy order (INTRADAY)
      buyPrice = tick.last_price;
      position = 'long';
      console.log(`Buy executed at ${buyPrice} for quantity ${quantity}`);
      await executeTrade({
        tradingsymbol: stockInfo.tradingsymbol,
        exchange: stockInfo.exchange,
        transaction_type: "BUY",
        quantity: quantity,
        order_type: "MARKET",
        product: "MIS" // Intraday
      });
    } else if (position === 'long' && tick.last_price >= buyPrice * 1.01) {
      // Sell if 1% profit
      console.log(`Sell signal! Bought at ${buyPrice}, current price ${tick.last_price} (>= 1% profit)`);
      await executeTrade({
        tradingsymbol: stockInfo.tradingsymbol,
        exchange: stockInfo.exchange,
        transaction_type: "SELL",
        quantity: quantity,
        order_type: "MARKET",
        product: "MIS" // Intraday
      });
      position = null;
      buyPrice = null;
    }
  } catch (error) {
    console.error("Trade execution error:", error.message);
  }
}

exports.startLiveTrading = async (req, res) => {
  const { selectedSector, strategyId, maxCapital } = req.body;

  if (!selectedSector || !strategyId || !maxCapital) {
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }

  // Get the token and symbol for the single stock
  const stockObj = sectorStocks[selectedSector];
  if (!stockObj) {
    return res.status(400).json({ success: false, message: "Invalid stock name" });
  }
  const stockIds = [stockObj.token];

  // Use the correct trading symbol from config
  const stockInfo = {
    tradingsymbol: stockObj.symbol,
    exchange: "NSE"
  };

  const { apiKey, accessToken } = zerodha;

  const ticker = new KiteTicker({
    api_key: apiKey,
    access_token: accessToken
  });

  ticker.connect();

  ticker.on("connect", () => {
    console.log("KiteTicker connected. Subscribing to token:", stockIds);
    ticker.subscribe(stockIds.map(Number)); // Ensure tokens are numbers
    ticker.setMode(ticker.modeFull, stockIds.map(Number));
  });

  ticker.on("ticks", (ticks) => {
    console.log("Received ticks:");
    ticks.forEach(tick => processTickToOHLCV(tick, 10000, stockInfo, maxCapital));
  });

  ticker.on("error", (err) => {
    console.error("KiteTicker error:", err);
  });

  ticker.on("disconnect", (reason) => {
    console.log("KiteTicker disconnected:", reason);
  });

  return res.json({
    success: true,
    message: "Live trading started and ticker streaming with 10s OHLCV aggregation and intraday strategy",
    stockIds,
    strategyId,
    maxCapital
  });
};