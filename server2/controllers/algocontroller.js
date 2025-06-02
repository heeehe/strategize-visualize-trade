// algocontroller.js
const express = require('express');
const cors = require('cors');
const { Worker } = require('worker_threads');
const path = require('path');
const config = require('../config'); // Adjust path as necessary
const fs = require('fs');
const { executeTrade } = require('./tradeController'); // Adjust path as necessary

const app = express();
app.use(cors());
app.use(express.json());

let activeWorkers = {}; // symbol → worker
let signalLog = [];

function stopAllWorkers(reason) {
  for (const symbol in activeWorkers) {
    activeWorkers[symbol].terminate();
    delete activeWorkers[symbol];
  }
  console.log('All workers stopped:', reason);
  signalLog.push({ type: 'system', message: `Trading halted: ${reason}` });
}

exports.startLiveTrading = async (req, res) => {
  //const { selectedSector, strategyId, maxCapital } = req.body;
  const { selectedSector, strategyId, maxCapital } = req.body;
  const selectedStocks = config.sectorStocks[selectedSector];

  if (!selectedStocks) {
    return res.status(400).json({ error: 'Invalid stock type' });
  }

  const symbols = Object.keys(selectedStocks);
  console.log(`Starting live strategyId for ${symbols.length} symbols under ${selectedSector}`);

  for (const symbol of symbols) {
    if (activeWorkers[symbol]) continue; // already running

    const worker = new Worker(path.resolve(__dirname, "../workers/symbolWorker.js"), {
      workerData: { symbol, strategyId, maxCapital, sector: selectedSector }
    });

    worker.on('message', async(msg) => {
      if (msg.type === 'stop-all') {
        stopAllWorkers(msg.reason);
        return;
      }

      console.log(`[Signal] ${msg.symbol} | ${msg.date} | ${msg.signal}`);
      if (msg.signal.includes('Buy')) {
        const tradeResult = await executeTrade({
          tradingsymbol: msg.symbol,
          exchange: "NSE",
          transaction_type: "BUY",
          quantity: 1,
          order_type: "MARKET",
          product: "CNC"
        });
        signalLog.push({ ...msg, execution: tradeResult });
      } else if (msg.signal.includes('Exit')) {
        const tradeResult = await executeTrade({
          tradingsymbol: msg.symbol,
          exchange: "NSE",
          transaction_type: "SELL",
          quantity: 1,
          order_type: "MARKET",
          product: "CNC"
        });
        signalLog.push({ ...msg, execution: tradeResult });
      } else {
        signalLog.push(msg);
      }
      //fs.appendFileSync('signal_log.json', JSON.stringify(msg) + '\n');
    });

    worker.on('error', (err) => {
      console.error(`Error in worker for ${symbol}:`, err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`Worker for ${symbol} exited with code ${code}`);
      }
      delete activeWorkers[symbol];
    });

    activeWorkers[symbol] = worker;
  }

  return res.status(200).json({ message: 'Live trading started' });
};

app.post('/stop-live', async (req, res) => {
  stopAllWorkers('Manual stop');
  return res.status(200).json({ message: 'Live trading stopped' });
});

app.get('/log', (req, res) => {
  return res.status(200).json({ signals: signalLog });
});

//const PORT = 4000;
//app.listen(PORT, () => console.log(`Live strategyId Server running on port ${PORT}`));