const express = require('express');
const { runBacktest } = require('../controllers/backtestController');
const router = express.Router();

router.post('/', runBacktest);

module.exports = router;
