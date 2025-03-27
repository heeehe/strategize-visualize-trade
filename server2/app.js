const express = require('express');
const cors=require('cors')
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
const authRoutes = require('./routes/authRoutes'); // Import routes

app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.use('/api/validate-keys', authRoutes);
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
