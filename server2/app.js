const express = require('express');
const cors=require('cors')
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
const authRoutes = require('./routes/authRoutes'); // Import routes
const backRoutes = require('./routes/backRoutes');
const algo = require('./routes/algoroute'); // Import algo routes


app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.use('/', authRoutes);
app.use('/api/backtest', backRoutes);
app.use('/api/live', algo);
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
