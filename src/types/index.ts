
export type StrategyParam = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
};

export type Strategy = {
  id: string;
  name: string;
  description?: string;
  params: StrategyParam[];
};

export type BacktestResult = {
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
  dailyReturns: ReturnPoint[];
  performance: PerformanceMetrics;
};

export type Trade = {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  profit?: number;
};

export type EquityPoint = {
  date: string;
  value: number;
};

export type ReturnPoint = {
  date: string;
  value: number;
};

export type PerformanceMetrics = {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradesCount: number;
};
