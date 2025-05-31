const express = require('express');
const router = express.Router();
const { authenticateUser, handleZerodhaCallback } = require('../controllers/authController');

// Route to generate login URL
router.post('/zerodha/login', authenticateUser);

// Route to handle Zerodha callback and generate access token
router.post('/zerodha/callback', handleZerodhaCallback);

module.exports = router;

