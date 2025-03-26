import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API = {
  // Auth
  storeKeys: async (userId: string, key: string, secret: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key, secret }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to store keys');
      return true;
    } catch (error) {
      toast.error("Failed to save API keys");
      return false;
    }
  },

  // Backtesting
  runBacktest: async (
    userId: string,
    symbol: string, 
    strategyId: string, 
    params: any, 
    startDate: string, 
    endDate: string, 
    initialCapital: number
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          symbol,
          strategy: strategyId,
          params,
          startDate,
          endDate,
          initialCapital
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Backtest failed');
      return await response.json();
    } catch (error) {
      toast.error("Backtest failed");
      throw error;
    }
  },

  // Live Trading
  startLiveTrading: async (userId: string, symbol: string, strategyId: string, params: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/live-trading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, symbol, strategy: strategyId, params }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to start trading');
      return true;
    } catch (error) {
      toast.error("Failed to start live trading");
      return false;
    }
  }
};
