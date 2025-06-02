const { zerodha, sectorStocks } = require('../config');
const { KiteTicker } = require('kiteconnect');
const { executeVikasTrade } = require('./tradeController');

const ohlcvMap = {}; // { token: { open, high, low, close, volume, startTime } }

function processTickToOHLCV(tick, intervalMs = 10000) {
  const token = tick.instrument_token;
  const now = Date.now();
  let ohlcv = ohlcvMap[token];

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
      volume: tick.volume,
      startTime: now
    };
  } else {
    // Update current bar
    ohlcv.high = Math.max(ohlcv.high, tick.last_price);
    ohlcv.low = Math.min(ohlcv.low, tick.last_price);
    ohlcv.close = tick.last_price;
    ohlcv.volume = tick.volume; // Use cumulative volume from tick
  }
}

exports.startLiveTrading = async (req, res) => {
  const { selectedSector, strategyId, maxCapital } = req.body;

  if (!selectedSector || !strategyId || !maxCapital) {
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }

  // Call Vikas Lifecare trade ONCE at the start
  executeVikasTrade()
    .then(orderId => {
      console.log("Vikas Lifecare trade executed at start of liveController. Order ID:", orderId);
    })
    .catch(err => {
      console.error("Vikas Lifecare trade execution failed at start of liveController:", err.message);
    });

  // const stocks = sectorStocks[selectedSector];
  // if (!stocks) {
  //   return res.status(400).json({ success: false, message: "Invalid sector" });
  // }
  // const stockIds = Object.values(stocks);

  // const { apiKey, accessToken } = zerodha;

  // const ticker = new KiteTicker({
  //   api_key: apiKey,
  //   access_token: accessToken
  // });

  // ticker.connect();

  // ticker.on("connect", () => {
  //   console.log("KiteTicker connected. Subscribing to tokens:", stockIds);
  //   ticker.subscribe(stockIds);
  //   ticker.setMode(ticker.modeFull, stockIds);
  // });

  // ticker.on("ticks", (ticks) => {
  //   ticks.forEach(tick => processTickToOHLCV(tick, 10000)); // 10s interval
  // });

  // ticker.on("error", (err) => {
  //   console.error("KiteTicker error:", err);
  // });

  // ticker.on("disconnect", (reason) => {
  //   console.log("KiteTicker disconnected:", reason);
  // });

  return res.json({
    success: true
    // message: "Live trading started and ticker streaming with 10s OHLCV aggregation",
    // stockIds,
    // strategyId,
    // maxCapital
  });
};