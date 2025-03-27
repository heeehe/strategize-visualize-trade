const express = require('express');
const { authenticateUser } = require('../controllers/authController');
const router = express.Router();

router.post('/', authenticateUser);

module.exports = router;
