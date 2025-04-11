const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const categoryToSymbols = {
  'Big Tech': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "KOTAKBANK.NS", "LT.NS", "SBIN.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS",
    "AXISBANK.NS", "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS",
    "BPCL.NS", "BHARTIARTL.NS", "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS",
    "DIVISLAB.NS", "DRREDDY.NS", "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS",
    "HEROMOTOCO.NS", "HDFCLIFE.NS", "INDUSINDBK.NS", "JSWSTEEL.NS",
    "M&M.NS", "MARUTI.NS", "NESTLEIND.NS", "NTPC.NS", "ONGC.NS",
    "POWERGRID.NS", "SBILIFE.NS", "SHREECEM.NS", "SUNPHARMA.NS",
    "TATACONSUM.NS", "TATAMOTORS.NS", "TATASTEEL.NS", "TECHM.NS",
    "TITAN.NS", "ULTRACEMCO.NS", "UPL.NS", "WIPRO.NS"],
  'AI & Semiconductors': ['NVDA', 'AMD', 'TSM', 'INTC'],
  'Electric Vehicles': ['TSLA', 'NIO', 'RIVN', 'LCID'],
  'Banking Giants': ['JPM', 'BAC', 'C', 'GS', 'WFC'],
  'Indian IT': ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"]
};
const runWorker = (symbols, strategyId, params, startDate, endDate, initialCapital) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, "../workers/worker.js"), {
      workerData: { 
        symbols, 
        params, 
        startDate, 
        endDate, 
        initialCapital 
      }
    });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};

const runBacktest = async (req, res) => {
  const { selectedCategory, strategyId, params, startDate, endDate, initialCapital } = req.body;
  const symbols = categoryToSymbols[selectedCategory];

  if (!symbols) return res.status(400).json({ error: "Invalid category" });

  try {
    const result = await runWorker(symbols, strategyId, params, startDate, endDate, initialCapital);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error running worker:", err);
    res.status(500).json({ error: "Failed to run backtest" });
  }
};

module.exports = {
  runBacktest
};