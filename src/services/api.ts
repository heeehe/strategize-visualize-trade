import { toast } from "sonner";
import axios from "axios"
// Define the API base URL for server interactions
const API_BASE_URL = "http://localhost:3000";

// State interfaces
export interface TradeData {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  profit?: number;
}

export interface PerformanceData {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  tradesCount: number;
}

export interface BacktestResult {
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  performance: PerformanceData;
  trades: TradeData[];
  equityCurve: {date: string, value: number}[];
  dailyReturns: {date: string, value: number}[];
}

export interface StrategyParam {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  params: StrategyParam[];
}

export interface Symbol {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

// Mock API functions for now - would be replaced with actual API calls
export const API = {
  // Auth
  getApiKeys: async (): Promise<{apiKey: string, secretKey: string}> => {
    // In a real app, these would be retrieved from secure storage
    return {
      apiKey: localStorage.getItem('apiKey') || '',
      secretKey: localStorage.getItem('secretKey') || ''
    };
  },
  
  saveApiKeys: async (apiKey: string, secretKey: string): Promise<boolean> => {
    try {

    } catch (error) {
      console.error("Failed to save API keys:", error);
      return false;
    }
  },

  validateApiKeys: async (apiKey: string, secretKey: string): Promise<boolean> => {
    try {
      console.log(apiKey,secretKey)
      const response = await axios.post(`${API_BASE_URL}/api/validate-keys`, { apiKey, secretKey });
      if(response.data.isValid){
        localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('secretKey', secretKey);
      }

      return response.data.isValid; // Assuming the server returns { isValid: true/false }
    } catch (error) {
      console.error("API key validation failed:", error);
      return false;
    }
  },
  
  // Symbols
  // getAvailableSymbols: async (): Promise<Symbol[]> => {
  //   // This would fetch from your backend
  //   return [
  //     { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  //     { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  //     { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  //     { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
  //     { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ' },
  //     { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' }
  //   ];
  // },
  // getAvailableCategories: async (): Promise<{ category: string, stocks: Symbol[] }[]> => {
  //   return [
  //     {
  //       category: 'Big Tech',
  //       stocks: [
  //         { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' }
  //       ]
  //     },
  //     {
  //       category: 'AI & Semiconductors',
  //       stocks: [
  //         { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Company', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ' }
  //       ]
  //     },
  //     {
  //       category: 'Electric Vehicles',
  //       stocks: [
  //         { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'NIO', name: 'NIO Inc.', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'RIVN', name: 'Rivian Automotive, Inc.', type: 'stock', exchange: 'NASDAQ' },
  //         { symbol: 'LCID', name: 'Lucid Group, Inc.', type: 'stock', exchange: 'NASDAQ' }
  //       ]
  //     },
  //     {
  //       category: 'Banking Giants',
  //       stocks: [
  //         { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'BAC', name: 'Bank of America Corporation', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'C', name: 'Citigroup Inc.', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'GS', name: 'Goldman Sachs Group, Inc.', type: 'stock', exchange: 'NYSE' },
  //         { symbol: 'WFC', name: 'Wells Fargo & Company', type: 'stock', exchange: 'NYSE' }
  //       ]
  //     }
  //     // Add more categories if needed
  //   ];
  // },
  getAvailableCategories: async (): Promise<{ category: string, symbols: string[] }[]> => {
    const categories = {
      "Bonds 📊": [
        "bundtreur", "ukgilttrgbp", "ustbondtrusd"
      ],
      "Crypto assets ₿": [
        "adausd", "aveusd", "batusd", "bchchf", "bcheur", "bchgbp", "bchusd",
        "btcchf", "btceur", "btcgbp", "btcusd", "cmpusd", "dshusd", "enjusd",
        "eosusd", "ethchf", "etheur", "ethgbp", "ethusd", "lnkusd", "ltcchf",
        "ltceur", "ltcgbp", "ltcusd", "matusd", "mkrusd", "trxusd", "uniusd",
        "xlmchf", "xlmeur", "xlmgbp", "xlmusd", "yfiusd"
      ],
      "Agricultural commodities ☕": [
        "cocoacmdusd", "coffeecmdusx", "cottoncmdusx", "ojuicecmdusx",
        "soybeancmdusx", "sugarcmdusd"
      ],
      "Energy commodities ⚡": [
        "dieselcmdusd", "brentcmdusd", "lightcmdusd", "gascmdusd"
      ],
      "Metals commodities ⚙️": [
        "coppercmdusd", "xpdcmdusd", "xptcmdusd"
      ],
      "Germany ETFs 🇩🇪📈": [
        "tecdaxedeeur"
      ],
      "France ETFs 🇫🇷📈": [
        "dsbfreur", "lvcfreur", "lyxbnkfreur"
      ],
      "Hong Kong ETFs 🇭🇰📈": [
        "2822hkhkd", "2828hkhkd", "2836hkhkd", "3188hkhkd"
      ],
      "United States ETFs 🇺🇸📈": [
        "diaususd", "dvyususd", "eemususd", "efaususd", "embususd", "ewhususd",
        "ewjususd", "ewwususd", "ewzususd", "ezuususd", "fxiususd", "gdxususd",
        "gdxjususd", "gldususd", "ibbususd", "iefususd", "ijhususd", "ijrususd",
        "iveususd", "ivwususd", "iwdususd", "iwfususd", "iwmususd", "iyrususd",
        "jnkususd", "qqqususd", "slvususd", "spyususd", "tltususd", "usoususd",
        "veaususd", "vgkususd", "vnqususd", "vxxususd", "xleususd", "xlfususd",
        "xliususd", "xlkususd", "xlpususd", "xluususd", "xlvususd", "xlyususd",
        "xopususd", "arkqususd", "arkxususd", "awayususd", "bitoususd", "btfususd",
        "espoususd", "finxususd", "ftxgususd", "iakususd", "itaususd", "jetsususd",
        "kieususd", "kreususd", "pbjususd", "pejususd", "ppaususd", "roboususd",
        "vdeususd", "xresususd"
      ],
      "Forex currencies 💱": [
        "audcad", "audchf", "audjpy", "audnzd", "audsgd", "cadchf", "cadhkd", "cadjpy",
        "chfjpy", "chfsgd", "euraud", "eurcad", "eurchf", "eurczk", "eurdkk", "eurgbp",
        "eurhkd", "eurhuf", "eurjpy", "eurnok", "eurnzd", "eurpln", "eursek", "eursgd",
        "eurtry", "gbpaud", "gbpcad", "gbpchf", "gbpjpy", "gbpnzd", "hkdjpy", "nzdcad",
        "nzdchf", "nzdjpy", "sgdjpy", "tryjpy", "usdaed", "usdcnh" // Truncated for brevity
      ]
    };
  
    // Mapping categories to the required structure
    const categoryList = Object.keys(categories).map(category => ({
      category,
      symbols: categories[category]
    }));
  
    return categoryList;
  },
  

  
  // Strategies
  getAvailableStrategies: async (): Promise<Strategy[]> => {
    return [
      {
        id: 'BasicTestStrategy',
        name: 'Mock Strategy',
        description: 'Strategy based on technical indicators',
        params: [
          {
            name: 'riskPerTrade',
            type: 'number',
            value: 0.02,
            min: 0.001,
            max: 0.1,
            step: 0.001,
            description: 'risk per trade as a percentage of account balance'
          },
          {
            name: 'stopLossPercent',
            type: 'number',
            value: 0.05,
            min: 0.01,
            max: 0.2,
            step: 0.01,
            description: 'Stop loss percentage'
          },
          {
            name: 'takeProfitPercent',
            type: 'number',
            value: 0.1,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            description: 'Take profit percentage'
          }
        ]
      },
      {
        id: 'rsi-strategy',
        name: 'RSI Strategy',
        description: 'Buy when RSI is oversold, sell when overbought',
        params: [
          {
            name: 'rsi_period',
            type: 'number',
            value: 14,
            min: 2,
            max: 50,
            step: 1,
            description: 'Period for the RSI calculation'
          },
          {
            name: 'oversold',
            type: 'number',
            value: 30,
            min: 10,
            max: 40,
            step: 1,
            description: 'Oversold level'
          },
          {
            name: 'overbought',
            type: 'number',
            value: 70,
            min: 60,
            max: 90,
            step: 1,
            description: 'Overbought level'
          }
        ]
      }
    ];
  },
  
  // Backtesting
  runBacktest: async (
    selectedCategory: string, 
    strategyId: string, 
    params: Record<string, any>, 
    startDate: string, 
    endDate: string, 
    initialCapital: number
  ): Promise<BacktestResult> => {
    try {
      toast.info("Running backtest...");
      
      const response = await axios.post(`${API_BASE_URL}/api/backtest`, {
        selectedCategory,
        strategyId,
        params,
        startDate,
        endDate,
        initialCapital
      });
  
      return response.data; 
    } catch (error) {0
      console.error("Backtest failed:", error);
      toast.error("Backtest failed. Please try again.");
      throw error;
    }
  },
  
  // Live Trading
  startLiveTrading: async (
    symbol: string,
    strategyId: string,
    params: Record<string, any>
  ): Promise<boolean> => {
    try {
      // This would connect to your backend to start the live trading
      toast.info(`Starting live trading for ${symbol}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Live trading started for ${symbol}`);
      return true;
    } catch (error) {
      console.error("Failed to start live trading:", error);
      toast.error("Failed to start live trading. Please check your API keys and try again.");
      return false;
    }
  },
  
  stopLiveTrading: async (): Promise<boolean> => {
    try {
      toast.info("Stopping live trading...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Live trading stopped");
      return true;
    } catch (error) {
      console.error("Failed to stop live trading:", error);
      toast.error("Failed to stop live trading");
      return false;
    }
  },
  
  getTradingStatus: async (): Promise<{
    isActive: boolean;
    symbol?: string;
    strategy?: string;
    startTime?: string;
    position?: { type: 'long' | 'short' | 'none'; quantity: number; entryPrice?: number };
  }> => {
    // Check if trading is active
    const randomActive = Math.random() > 0.5;
    if (!randomActive) return { isActive: false };
    
    return {
      isActive: true,
      symbol: 'AAPL',
      strategy: 'SMA Crossover',
      startTime: new Date().toISOString(),
      position: {
        type: Math.random() > 0.3 ? 'long' : 'none',
        quantity: Math.floor(Math.random() * 100) + 10,
        entryPrice: Math.random() > 0.5 ? 150 + Math.random() * 20 : undefined
      }
    };
  }
};
