// const jwt = require('jsonwebtoken');
const axios=require('axios');
const { isValid } = require('date-fns');
// Sample API keys for validation (Replace with DB validation in production)
const validKeys = {
    'sampleApiKey123': 'sampleSecretKey456'
};

const authenticateUser =async (req, res) => {
    const { apiKey, secretKey } = req.body;
    console.log(apiKey,secretKey)

    if (!apiKey || !secretKey) {
        return res.status(400).json({ success: false, message: "API key and Secret key are required" });
        console.log("erriii")
      }
    
      try {
        const response = await axios.get("https://paper-api.alpaca.markets/v2/account", {
          headers: {
            "APCA-API-KEY-ID": apiKey,
            "APCA-API-SECRET-KEY": secretKey,
          },
        });
    
        // If request is successful, keys are valid
        console.log("success")

        return res.json({ isValid: true, message: "API keys are valid", account: response.data });
      } catch (error) {
        // console.log(error)
        return res.status(401).json({
          success: false,
          message: "Invalid API keys or unauthorized access",
          error: error.response ? error.response.data : error.message,
        });
      }
};

module.exports = { authenticateUser };

