// runBacktestAddon.js
// runBacktestAddon.js
const addon = require('./build/Release/runBacktest');

// Now expects 4 arguments, NOT 2
function runBacktest(buffer, symbols, pointsPerSymbol, initialCapital = 10000) {
  return addon.runBacktest(buffer, symbols, pointsPerSymbol, initialCapital);
}

module.exports = { runBacktest };
