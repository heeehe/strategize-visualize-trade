module.exports = {
    zerodha: {
        apiKey: process.env.ZERODHA_API_KEY || '6jtwltogwhji2myg',
        accessToken: process.env.ZERODHA_ACCESS_TOKEN || 'XVg0AM5FYDjree1fjW5FwaSqVTOyOpz2',
    },
    sectorStocks: {
        "Vodafone Idea Ltd":   { token: 3677697, symbol: "IDEA" },
        "Yes Bank Ltd":        { token: 3050241, symbol: "YESBANK" },
        "Jaiprakash Power Ventures Ltd": { token: 415745, symbol: "JPPOWER" },
        "Alok Industries Ltd": { token: 1364225, symbol: "ALOKINDS" },
        "PC Jeweller Ltd":     { token: 1346049, symbol: "PCJEWELLER" }
    }
};