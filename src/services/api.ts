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

  validateApiKeys: async (apiKey: string, secretKey: string): Promise<string> => {
    try {
      console.log(apiKey,secretKey)
      const res = await axios.post(`${API_BASE_URL}/zerodha/login`, { apiKey, secretKey });
      if(res.data.success){
        localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('secretKey', secretKey);
      const loginUrlWithKey = res.data.loginUrl;
      console.log("Login URL with key:", loginUrlWithKey);

      return loginUrlWithKey
      }

      return 'false'; // Assuming the server returns { isValid: true/false }
    } catch (error) {
      console.error("API key validation failed:", error);
      return 'false';
    }
  },
  
  
  getAvailableCategories: async (): Promise<{ category: string, symbols: string[] }[]> => {
    // These categories and symbols are now sourced from the backend config.js (sectorStocks)
    // You should fetch from your backend API, but for now, hardcode to match config.js:
    return [
      {
        category: "Banking & Financial Services",
        symbols: [
          "IDBI", "SOUTHBANK", "IOB", "PNB", "CANBK", "IDFCFIRSTB", "UCOBANK", "MAHABANK", "YESBANK", "CENTRALBK", "PSB"
        ]
      },
      {
        category: "Energy & Power",
        symbols: [
          "NLCINDIA", "JPPOWER", "SUZLON", "RENUKA", "RPOWER", "NHPC", "SJVN"
        ]
      },
      {
        category: "Infrastructure & Engineering",
        symbols: [
          "NCC", "PNCINFRA", "TARMAT", "KNRCON", "IRB", "ASHOKA", "SALASAR", "NBCC"
        ]
      },
      {
        category: "Chemicals & Specialty Materials",
        symbols: [
          "GHCL", "NOCIL", "PIDILITIND", "SRF", "IGL", "KIRIINDUS", "VIKASECO"
        ]
      },
      {
        category: "Iron & Steel",
        symbols: [
          "HITECH", "SAIL", "TATASTEEL", "JINDALSTEL", "RAMASTEEL", "MUKANDLTD", "JSWSTEEL", "MSPL"
        ]
      },
      {
        category: "FMCG & Consumer Goods",
        symbols: [
          "ADOR", "BCLIND", "HATSUN", "HERITGFOOD", "VADILALIND"
        ]
      },
      {
        category: "Textiles & Manufacturing",
        symbols: [
          "ARVIND", "RAYMOND", "SRF", "VARDMNPOLY", "TRIDENT", "PAGEIND", "KPRMILL"
        ]
      },
      {
        category: "Logistics & Transport",
        symbols: [
          "MAHLOG", "BLUEDART", "CONCOR", "VRLLOG", "NAVKARCORP", "TCI", "ALLCARGO"
        ]
      },
      {
        category: "Real Estate",
        symbols: [
          "MAHLIFE", "SOBHA", "PHOENIXLTD", "DLF", "BRIGADE", "SUNTECK", "GODREJPROP", "OBEROIRLTY", "PRESTIGE"
        ]
      }
    ];
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
    selectedSector: string,
    strategyId: string,
    maxCapital: number
  ): Promise<boolean> => {
    try {
      toast.info(`Starting live trading for ${selectedSector}...`);
      // Replace the mock with a real API call:
      await axios.post(`${API_BASE_URL}/api/live/start`, {
        selectedSector,
        strategyId,
        maxCapital,
      });
      toast.success(`Live trading started for ${selectedSector}`);
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
