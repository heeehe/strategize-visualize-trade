import axios from 'axios';
import { BacktestResult, Strategy } from '@/types';

const API_URL = 'http://localhost:3000/api';

export const API = {
  getAvailableSymbols: async (): Promise<Symbol[]> => {
    try {
      const response = await axios.get(`${API_URL}/symbols`);
      return response.data;
    } catch (error) {
      console.error('Error fetching symbols:', error);
      return [];
    }
  },

  getAvailableCategories: async (): Promise<{ category: string }[]> => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [
        { category: 'Big Tech' },
        { category: 'AI & Semiconductors' },
        { category: 'Electric Vehicles' },
        { category: 'Banking Giants' },
        { category: 'Indian IT' }
      ];
    }
  },

  getAvailableStrategies: async (): Promise<Strategy[]> => {
    try {
      const response = await axios.get(`${API_URL}/strategies`);
      return response.data;
    } catch (error) {
      console.error('Error fetching strategies:', error);
      return [
        {
          id: 'moving_average_crossover',
          name: 'Moving Average Crossover',
          description: 'A strategy that generates signals based on the crossing of two moving averages',
          params: [
            {
              name: 'riskPerTrade',
              type: 'number',
              value: 2,
              min: 0.1,
              max: 10,
              step: 0.1,
              description: 'Percentage of account to risk per trade'
            },
            {
              name: 'stopLossPercent',
              type: 'number',
              value: 2,
              min: 0.5,
              max: 10,
              step: 0.5,
              description: 'Stop loss percentage from entry price'
            },
            {
              name: 'takeProfitPercent',
              type: 'number',
              value: 4,
              min: 1,
              max: 20,
              step: 0.5,
              description: 'Take profit percentage from entry price'
            }
          ]
        },
        {
          id: 'rsi_strategy',
          name: 'RSI Strategy',
          description: 'A strategy that generates signals based on RSI overbought/oversold conditions',
          params: [
            {
              name: 'riskPerTrade',
              type: 'number',
              value: 2,
              min: 0.1,
              max: 10,
              step: 0.1,
              description: 'Percentage of account to risk per trade'
            },
            {
              name: 'stopLossPercent',
              type: 'number',
              value: 2,
              min: 0.5,
              max: 10,
              step: 0.5,
              description: 'Stop loss percentage from entry price'
            },
            {
              name: 'takeProfitPercent',
              type: 'number',
              value: 4,
              min: 1,
              max: 20,
              step: 0.5,
              description: 'Take profit percentage from entry price'
            }
          ]
        }
      ];
    }
  },

  runBacktest: async (
    selectedCategory: string,
    strategyId: string,
    params: {
      riskPerTrade: number;
      stopLossPercent: number;
      takeProfitPercent: number;
    },
    startDate: string,
    endDate: string,
    initialCapital: number
  ): Promise<{ results: BacktestResult[] }> => {
    try {
      const response = await axios.post(`${API_URL}/backtest`, {
        selectedCategory,
        strategyId,
        params,
        startDate,
        endDate,
        initialCapital
      });
      return response.data;
    } catch (error) {
      console.error('Error running backtest:', error);
      throw error;
    }
  },

  startLiveTrading: async (
    symbol: string,
    strategyId: string,
    params: Record<string, any>
  ): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/live-trading/start`, {
        symbol,
        strategyId,
        params
      });
      return response.data.success;
    } catch (error) {
      console.error('Error starting live trading:', error);
      return false;
    }
  },

  stopLiveTrading: async (tradingId: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/live-trading/stop`, {
        tradingId
      });
      return response.data.success;
    } catch (error) {
      console.error('Error stopping live trading:', error);
      return false;
    }
  },

  getLiveTradingStatus: async (): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_URL}/live-trading/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching live trading status:', error);
      return [];
    }
  },

  validateApiKeys: async (exchange: string, apiKey: string, apiSecret: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_URL}/validate-keys`, {
        exchange,
        apiKey,
        apiSecret
      });
      return response.data.valid;
    } catch (error) {
      console.error('Error validating API keys:', error);
      return false;
    }
  }
};

export type Symbol = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};
