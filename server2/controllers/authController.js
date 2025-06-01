// const jwt = require('jsonwebtoken');
const axios=require('axios');
const { isValid } = require('date-fns');
const crypto = require('crypto');
const { KiteConnect } = require("kiteconnect");

const authenticateUser = async (req, res) => {
  const { apiKey, secretKey } = req.body;

  if (!apiKey || !secretKey) {
    return res.status(400).json({ success: false, message: "API key and Secret key are required" });
  }

  try {
    const kc = new KiteConnect({ api_key: apiKey });

    // Generate the login URL
    const loginUrl = kc.getLoginURL();

    console.log("Login URL generated successfully");
    return res.json({ success: true, loginUrl });
  } catch (error) {
    console.error("Error generating login URL:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate login URL",
      error: error.message,
    });
  }
};

const handleZerodhaCallback = async (req, res) => {
  const { request_token, apiKey, secretKey } = req.body;

  if (!request_token || !apiKey || !secretKey) {
    return res.status(400).json({ success: false, message: "Missing required parameters" });
  }

  try {
    const kc = new KiteConnect({ api_key: apiKey });

    // Generate the checksum
    const checksum = crypto
      .createHash('sha256')
      .update(`${apiKey}${request_token}${secretKey}`)
      .digest('hex');

    // Exchange the request token for an access token
    const session = await kc.generateSession(request_token, secretKey);

    console.log("Access token generated successfully:", session.access_token);

    // Set the access token for future API calls
    kc.setAccessToken(session.access_token);

    // Fetch account details
    const accountDetails = await kc.getProfile();

    // Return the access token and account details to the client
    return res.json({
      success: true,
      accessToken: session.access_token,
      publicToken: session.public_token,
      userId: session.user_id,
      accountDetails,
    });
  } catch (error) {
    console.error("Error generating access token or fetching account details:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate access token or fetch account details",
      error: error.message,
    });
  }
};

module.exports = { authenticateUser, handleZerodhaCallback };
