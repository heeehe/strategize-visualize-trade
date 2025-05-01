const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
//const { createStrategy } = require('../strategies');
const path = require("path");
const { runBacktest } = require('../addons/backtest/runBacktestAddon');

const app = express();
app.use(cors());
app.use(express.json());

const categoryToSymbols = {
  "Bonds 📊": [
    "bundtreur", "ukgilttrgbp", "ustbondtrusd"
  ],
  "Crypto assets ₿": [
    "adausd", "aveusd", "batusd", "bchchf", "bcheur", "bchgbp", "bchusd",
    "btcchf", "btceur", "btcgbp", "btcusd", "cmpusd", "dshusd", "enjusd",
    "eosusd", "ethchf", "etheur", "ethgbp", "ethusd", "lnkusd", "ltcchf",
    "ltceur", "ltcgbp", "ltcusd", "matusd", "mkrusd", "trxusd", "uniusd",
    "xlmchf", "xlmeur", "xlmgbp", "xlmusd", "yfiusd"
  ],
  "Agricultural commodities ☕": [
    "cocoacmdusd", "coffeecmdusx", "cottoncmdusx", "ojuicecmdusx",
    "soybeancmdusx", "sugarcmdusd"
  ],
  "Energy commodities ⚡": [
    "dieselcmdusd", "brentcmdusd", "lightcmdusd", "gascmdusd"
  ],
  "Metals commodities ⚙️": [
    "coppercmdusd", "xpdcmdusd", "xptcmdusd"
  ],
  "Germany ETFs 🇩🇪📈": [
    "tecdaxedeeur"
  ],
  "France ETFs 🇫🇷📈": [
    "dsbfreur", "lvcfreur", "lyxbnkfreur"
  ],
  "Hong Kong ETFs 🇭🇰📈": [
    "2822hkhkd", "2828hkhkd", "2836hkhkd", "3188hkhkd"
  ],
  "United States ETFs 🇺🇸📈": [
    "diaususd", "dvyususd", "eemususd", "efaususd", "embususd", "ewhususd",
    "ewjususd", "ewwususd", "ewzususd", "ezuususd", "fxiususd", "gdxususd",
    "gdxjususd", "gldususd", "ibbususd", "iefususd", "ijhususd", "ijrususd",
    "iveususd", "ivwususd", "iwdususd", "iwfususd", "iwmususd", "iyrususd",
    "jnkususd", "qqqususd", "slvususd", "spyususd", "tltususd", "usoususd",
    "veaususd", "vgkususd", "vnqususd", "vxxususd", "xleususd", "xlfususd",
    "xliususd", "xlkususd", "xlpususd", "xluususd", "xlvususd", "xlyususd",
    "xopususd", "arkqususd", "arkxususd", "awayususd", "bitoususd", "btfususd",
    "espoususd", "finxususd", "ftxgususd", "iakususd", "itaususd", "jetsususd",
    "kieususd", "kreususd", "pbjususd", "pejususd", "ppaususd", "roboususd",
    "vdeususd", "xresususd"
  ],
  "Forex currencies 💱": [
    "audcad", "audchf", "audjpy", "audnzd", "audsgd", "cadchf", "cadhkd", "cadjpy",
    "chfjpy", "chfsgd", "euraud", "eurcad", "eurchf", "eurczk", "eurdkk", "eurgbp",
    "eurhkd", "eurhuf", "eurjpy", "eurnok", "eurnzd", "eurpln", "eursek", "eursgd",
    "eurtry", "gbpaud", "gbpcad", "gbpchf", "gbpjpy", "gbpnzd", "hkdjpy", "nzdcad",
    "nzdchf", "nzdjpy", "sgdjpy", "tryjpy", "usdaed", "usdcnh" // Truncated for brevity
  ]
};
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
    // backtestController.js
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

// const runWorker = (symbols, strategyId, params, startDate, endDate, initialCapital) => {
//   return new Promise((resolve, reject) => {
//     const worker = new Worker(path.resolve(__dirname, "../workers/worker.js"), {
//       workerData: { 
//         symbols, 
//         params, 
//         startDate, 
//         endDate, 
//         initialCapital,
//         strategyId
//       }
//     });

//     worker.on("message", resolve);
//     worker.on("error", reject);
//     worker.on("exit", code => {
//       if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
//     });
//   });
// };

// const runBacktest = async (req, res) => {
//   const { selectedCategory, strategyId, params, startDate, endDate, initialCapital } = req.body;
//   const symbols = categoryToSymbols[selectedCategory];

//   if (!symbols) return res.status(400).json({ error: "Invalid category" });

//   try {
//     const result = await runWorker(symbols, strategyId, params, startDate, endDate, initialCapital);
//     res.status(200).json(result);
//   } catch (err) {
//     console.error("Error running worker:", err);
//     res.status(500).json({ error: "Failed to run backtest" });
//   }
// };


// module.exports = {
//   runBacktest
// };