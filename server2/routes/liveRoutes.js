const express = require('express');
const { startLiveTrading } = require('../controllers/liveController');
const router = express.Router();

router.post('/start', startLiveTrading);

module.exports = router;