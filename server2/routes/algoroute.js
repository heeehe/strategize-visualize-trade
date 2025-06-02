const express = require('express');
const { startLiveTrading } = require('../controllers/algocontroller');
const router = express.Router();

router.post('/start', startLiveTrading);

module.exports = router;