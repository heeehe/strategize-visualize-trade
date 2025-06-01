import { KiteTicker } from "kiteconnect";
import { EventEmitter } from 'events';
import config from '../../config.js';

// Create event emitter for market data
const eventEmitter = new EventEmitter();

// Use your actual tokens here
const apiKey = config.zerodha.apiKey;
const accessToken = config.zerodha.accessToken;

// Create a KiteTicker instance
const ticker = new KiteTicker({
  api_key: apiKey,
  access_token: accessToken,
});

// List of instrument tokens you want to subscribe to
const tokens = [738561, 256265]; // Example: NIFTY, RELIANCE

// Store latest prices
const lastPrices = new Map();

// Handle incoming market data
const handleTicks = (ticks) => {
    ticks.forEach(tick => {
        const marketData = {
            symbol: tick.instrument_token.toString(),
            timestamp: new Date(tick.timestamp),
            price: tick.last_price,
            open: tick.ohlc.open,
            high: tick.ohlc.high,
            low: tick.ohlc.low,
            close: tick.last_price,
            volume: tick.volume
        };

        // Store the latest price
        lastPrices.set(marketData.symbol, marketData);
        
        // Emit the data to listeners
        eventEmitter.emit('marketData', marketData);
    });
};

// Event: On connection, subscribe to tokens
ticker.on("connect", () => {
  console.log("Connected to Zerodha WebSocket");
  ticker.subscribe(tokens);
  ticker.setMode(ticker.modeFull, tokens);
});

// Event: On receiving ticks
ticker.on("ticks", (ticks) => {
  console.log("Ticks:", ticks);
  handleTicks(ticks);
});

// Event: On error
ticker.on("error", (err) => {
  console.error("WebSocket error:", err);
});

// Event: On disconnect
ticker.on("disconnect", (err) => {
  console.log("Disconnected:", err);
});

// Connect to the WebSocket
ticker.connect();

// Get latest price for a symbol
const getLatestPrice = (symbol) => {
    return lastPrices.get(symbol);
};

// Export functions
export default {
    getLatestPrice,
    on: eventEmitter.on.bind(eventEmitter)
};

export function createZerodhaTicker(tokens) {
  const ticker = new KiteTicker({
    api_key: config.zerodha.apiKey,
    access_token: config.zerodha.accessToken,
  });

  ticker.on("connect", () => {
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens);
  });

  return ticker;
} 