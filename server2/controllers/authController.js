// const jwt = require('jsonwebtoken');

// Sample API keys for validation (Replace with DB validation in production)
const validKeys = {
    'sampleApiKey123': 'sampleSecretKey456'
};

const authenticateUser = (req, res) => {
    const { apiKey, secretKey } = req.body;

    if (!apiKey || !secretKey) {
        return res.status(400).json({ message: 'API key and secret key are required' });
    }
    console.log(apiKey,secretKey)

    // Validate API key and secret key
    // if (validKeys[apiKey] !== secretKey) {
    //     return res.status(401).json({ message: 'Invalid API key or secret key' });
    // }

    // // Generate JWT token
    // const token = jwt.sign({ apiKey }, 'your_jwt_secret', { expiresIn: '1h' });
    // res.json({ token });
};

module.exports = { authenticateUser };
