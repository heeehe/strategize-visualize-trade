const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
const path = require("path");
const { runBacktest } = require('../addons/backtest/runBacktestAddon');
const config = require("../config"); // <-- Import config.js

const app = express();
app.use(cors());
app.use(express.json());

// Use sectorStocks from config.js for category-to-symbols mapping
const categoryToSymbols = {};
for (const [category, symbolObj] of Object.entries(config.sectorStocks)) {
  categoryToSymbols[category] = Object.keys(symbolObj);
}

const fetchDataWithWorker = (symbols, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "../workers/worker.js"), {
      workerData: { symbols, startDate, endDate }
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};

const runBacktestHandler = async (req, res) => {
  const { selectedCategory, params, startDate, endDate, initialCapital } = req.body;
  const symbols = categoryToSymbols[selectedCategory];

  if (!symbols) return res.status(400).json({ error: "Invalid category" });

  try {
    // Step 1: Fetch the data using worker thread
    fetchedData = await fetchDataWithWorker(symbols, startDate, endDate);
    const { buffer, symbols : Fetchedsymbols, pointsPerSymbol } = fetchedData;
    console.log("Fetched Data:");
    console.log("Buffer Length (bytes):", buffer?.byteLength);
    console.log("Fetched Symbols:", Fetchedsymbols);
    console.log("Points Per Symbol:", pointsPerSymbol);
    console.log("Initial Capital:", initialCapital);
    const nodeBuffer = Buffer.from(buffer);

    // Step 2: Run the backtest in C++ addon
    const rawResult = runBacktest(nodeBuffer, Fetchedsymbols, pointsPerSymbol, initialCapital);
    const resultsArray = Array.isArray(rawResult) ? rawResult : [rawResult];

    // Augment each result with symbol, dates, and compute daily returns
    const enhancedResults = resultsArray.map((r, index) => {
      // Determine symbol for this result (match index)
      const sym = fetchedData && fetchedData[index] && fetchedData[index].symbol 
                  ? fetchedData[index].symbol 
                  : undefined;
      // Compute daily returns from the equity curve
      let dailyReturns = [];
      if (r.equityCurve && r.equityCurve.length > 0) {
        // Group by day and take the last equity value of each day (closing equity)
        const closes = {};
        r.equityCurve.forEach(pt => {
          const timestamp = Number(pt.date);
          if (!isNaN(timestamp)) {
            const day = new Date(timestamp).toISOString().substring(0, 10);
            closes[day] = pt.value;
          }
        });
        
        const days = Object.keys(closes).sort();
        for (let i = 1; i < days.length; i++) {
          const prev = closes[days[i - 1]];
          const curr = closes[days[i]];
          if (prev !== undefined && curr !== undefined) {
            const pct = ((curr - prev) / prev) * 100;
            dailyReturns.push({ date: days[i], value: pct });
          }
        }
      }
      return {
        symbol: sym,
        startDate,
        endDate,
        initialCapital,
        // Preserve other fields (finalCapital, performance, trades, equityCurve, etc.)
        ...r,
        dailyReturns
      };
    });
    res.status(200).json({results : enhancedResults});
  } catch (err) {
    console.error("Error running backtest:", err);
    res.status(500).json({ error: "Failed to run backtest" });
  }
};

module.exports = {
  runBacktest: runBacktestHandler
};