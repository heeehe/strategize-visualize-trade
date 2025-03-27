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
      localStorage.setItem('apiKey', apiKey);
      localStorage.setItem('secretKey', secretKey);
      return true;
    } catch (error) {
      console.error("Failed to save API keys:", error);
      return false;
    }
  },

  validateApiKeys: async (apiKey: string, secretKey: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/validate-keys`, { apiKey, secretKey });

      return response.data.isValid; // Assuming the server returns { isValid: true/false }
    } catch (error) {
      console.error("API key validation failed:", error);
      return false;
    }
  },
  
  // Symbols
  getAvailableSymbols: async (): Promise<Symbol[]> => {
    // This would fetch from your backend
    return [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock', exchange: 'NASDAQ' },
      { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' }
    ];
  },
  
  // Strategies
  getAvailableStrategies: async (): Promise<Strategy[]> => {
    return [
      {
        id: 'sma-cross',
        name: 'SMA Crossover',
        description: 'Strategy based on the crossover of two Simple Moving Averages',
        params: [
          {
            name: 'fast_period',
            type: 'number',
            value: 10,
            min: 2,
            max: 50,
            step: 1,
            description: 'Period for the fast SMA'
          },
          {
            name: 'slow_period',
            type: 'number',
            value: 30,
            min: 5,
            max: 200,
            step: 1,
            description: 'Period for the slow SMA'
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
    symbol: string, 
    strategyId: string, 
    params: Record<string, any>, 
    startDate: string, 
    endDate: string, 
    initialCapital: number
  ): Promise<BacktestResult> => {
    try {
      toast.info("Running backtest...");
      
      // This would be a real API call in a production app
      // For now, simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result with somewhat realistic data
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();
      const dayDiff = Math.floor((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));
      
      // Generate mock equity curve
      const equityCurve = [];
      let currentValue = initialCapital;
      let currentDate = new Date(startDate);
      
      const dailyReturns = [];
      const trades = [];
      
      // Generate some random trades
      const numTrades = Math.floor(dayDiff / 7); // Roughly one trade per week
      let totalProfit = 0;
      let wins = 0;
      
      for (let i = 0; i < dayDiff; i++) {
        // Skip weekends
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
          continue;
        }
        
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Add some randomness to the equity curve
        const dailyChange = (Math.random() * 2 - 0.5) * (initialCapital * 0.01);
        currentValue += dailyChange;
        
        equityCurve.push({ date: dateStr, value: currentValue });
        dailyReturns.push({ date: dateStr, value: dailyChange / currentValue * 100 });
        
        // Generate some trades
        if (Math.random() < 0.15 && trades.length < numTrades) {
          const isBuy = trades.length % 2 === 0;
          const price = 100 + Math.random() * 50;
          const quantity = Math.floor(Math.random() * 100) + 10;
          
          if (isBuy) {
            trades.push({
              date: dateStr,
              type: 'buy',
              price,
              quantity
            });
          } else {
            const profit = (price - trades[trades.length - 1].price) * quantity;
            totalProfit += profit;
            if (profit > 0) wins++;
            
            trades.push({
              date: dateStr,
              type: 'sell',
              price,
              quantity,
              profit
            });
          }
        }
        
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Ensure final value reflects total profit
      const finalCapital = initialCapital + totalProfit;
      
      return {
        symbol,
        startDate,
        endDate,
        initialCapital,
        finalCapital,
        performance: {
          totalReturn: ((finalCapital - initialCapital) / initialCapital) * 100,
          sharpeRatio: 1.2 + Math.random() * 0.8,
          maxDrawdown: -(5 + Math.random() * 10),
          winRate: (wins / (trades.length / 2)) * 100,
          tradesCount: trades.length
        },
        trades,
        equityCurve,
        dailyReturns
      };
    } catch (error) {
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
