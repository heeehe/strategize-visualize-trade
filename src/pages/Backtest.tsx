
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, BacktestResult, Strategy, Symbol } from "@/services/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, TrendingDown, Info, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar } from "recharts";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Backtest() {
  const [symbol, setSymbol] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2023-01-01");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch available symbols
  const { data: symbols = [], isLoading: isLoadingSymbols } = useQuery({
    queryKey: ['symbols'],
    queryFn: API.getAvailableSymbols,
  });

  // Fetch available strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: API.getAvailableStrategies,
  });

  // Find the selected strategy
  const selectedStrategy = strategies.find(s => s.id === strategyId);

  // Handle strategy change
  const handleStrategyChange = (id: string) => {
    setStrategyId(id);
    
    // Initialize parameters with default values
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      const initialParams: Record<string, any> = {};
      strategy.params.forEach(param => {
        initialParams[param.name] = param.value;
      });
      setStrategyParams(initialParams);
    }
  };

  // Handle parameter change
  const handleParamChange = (name: string, value: any) => {
    setStrategyParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Run backtest mutation
  const { mutate: runBacktest, isPending: isRunningBacktest } = useMutation({
    mutationFn: async () => {
      if (!symbol || !strategyId || !startDate || !endDate) {
        toast.error("Please fill in all required fields");
        return null;
      }
      
      return API.runBacktest(
        symbol,
        strategyId,
        strategyParams,
        startDate,
        endDate,
        initialCapital
      );
    },
    onSuccess: (data) => {
      if (data) {
        setBacktestResult(data);
        toast.success("Backtest completed successfully");
      }
    },
    onError: () => {
      toast.error("Failed to run backtest. Please try again.");
    }
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Start live trading with current strategy
  const handleStartLiveTrading = async () => {
    if (!backtestResult) return;
    
    const success = await API.startLiveTrading(
      backtestResult.symbol,
      strategyId,
      strategyParams
    );
    
    if (success) {
      toast.success("Live trading started successfully");
    }
  };

  return (
    <Layout className="relative">
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-medium">Backtest Your Strategy</h1>
            <p className="text-muted-foreground mt-1">Test your trading strategy against historical market data</p>
          </div>
          {backtestResult && (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setBacktestResult(null)}
              >
                New Backtest
              </Button>
              <Link to="/live">
                <Button 
                  className="gap-2"
                  onClick={handleStartLiveTrading}
                >
                  <ArrowRight className="w-4 h-4" /> Start Live Trading
                </Button>
              </Link>
            </div>
          )}
        </div>

        {!backtestResult ? (
          <Card className="shadow-sm animate-fade-in">
            <CardHeader>
              <CardTitle>Backtest Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Symbol Selection */}
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select a symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSymbols ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : (
                        symbols.map((s: Symbol) => (
                          <SelectItem key={s.symbol} value={s.symbol}>
                            {s.symbol} - {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Strategy Selection */}
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={strategyId} onValueChange={handleStrategyChange}>
                    <SelectTrigger id="strategy">
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingStrategies ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : (
                        strategies.map((s: Strategy) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                {/* Initial Capital */}
                <div className="space-y-2">
                  <Label htmlFor="initialCapital">Initial Capital</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Strategy Parameters */}
              {selectedStrategy && selectedStrategy.params.length > 0 && (
                <>
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Strategy Parameters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {selectedStrategy.params.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={param.name}>{param.name.replace(/_/g, ' ')}</Label>
                            <div className="relative group">
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                                {param.description}
                              </div>
                            </div>
                          </div>
                          {param.type === 'number' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                id={param.name}
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step || 1}
                                value={strategyParams[param.name] || param.value}
                                onChange={(e) => handleParamChange(param.name, Number(e.target.value))}
                              />
                            </div>
                          ) : param.type === 'select' && param.options ? (
                            <Select 
                              value={strategyParams[param.name]?.toString() || param.value?.toString()}
                              onValueChange={(v) => handleParamChange(param.name, v)}
                            >
                              <SelectTrigger id={param.name}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {param.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={param.name}
                              value={strategyParams[param.name] || param.value}
                              onChange={(e) => handleParamChange(param.name, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => runBacktest()}
                  disabled={isRunningBacktest || !symbol || !strategyId}
                  className="w-full md:w-auto"
                >
                  {isRunningBacktest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Backtest...
                    </>
                  ) : (
                    'Run Backtest'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Backtest Results
          <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold">
                      {backtestResult.performance.totalReturn.toFixed(2)}%
                    </span>
                    {backtestResult.performance.totalReturn > 0 ? 
                      <TrendingUp className="text-trading-profit h-6 w-6" /> : 
                      <TrendingDown className="text-trading-loss h-6 w-6" />
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(backtestResult.initialCapital)} → {formatCurrency(backtestResult.finalCapital)}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold">
                      {backtestResult.performance.sharpeRatio.toFixed(2)}
                    </span>
                    <BarChart3 className="text-trading-highlight h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold">
                      {backtestResult.performance.winRate.toFixed(2)}%
                    </span>
                    <TrendingUp className="text-trading-profit h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {backtestResult.performance.tradesCount} trades total
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Max Drawdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-semibold">
                      {backtestResult.performance.maxDrawdown.toFixed(2)}%
                    </span>
                    <TrendingDown className="text-trading-loss h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b">
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                    <TabsTrigger value="returns">Returns</TabsTrigger>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="p-6">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Performance Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b">
                          <span>Symbol</span>
                          <span className="font-medium">{backtestResult.symbol}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>Period</span>
                          <span className="font-medium">
                            {format(new Date(backtestResult.startDate), 'MMM d, yyyy')} - {format(new Date(backtestResult.endDate), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>Initial Capital</span>
                          <span className="font-medium">{formatCurrency(backtestResult.initialCapital)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>Final Capital</span>
                          <span className="font-medium">{formatCurrency(backtestResult.finalCapital)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>Absolute Return</span>
                          <span className={cn(
                            "font-medium",
                            backtestResult.finalCapital > backtestResult.initialCapital 
                              ? "text-trading-profit" 
                              : "text-trading-loss"
                          )}>
                            {formatCurrency(backtestResult.finalCapital - backtestResult.initialCapital)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>Total Return</span>
                          <span className={cn(
                            "font-medium",
                            backtestResult.performance.totalReturn > 0 
                              ? "text-trading-profit" 
                              : "text-trading-loss"
                          )}>
                            {backtestResult.performance.totalReturn.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Overview Chart</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={backtestResult.equityCurve}
                            margin={{ top: 20, right: 20, left: 20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => format(new Date(date), 'MMM d')}
                            />
                            <YAxis 
                              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                            />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(Number(value)), "Portfolio Value"]}
                              labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              fill="hsl(var(--primary))" 
                              fillOpacity={0.2} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="equity" className="mt-0">
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={backtestResult.equityCurve}
                        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), "Portfolio Value"]}
                          labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="returns" className="mt-0">
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={backtestResult.dailyReturns}
                        margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                        />
                        <Tooltip 
                          formatter={(value) => [`${Number(value).toFixed(2)}%`, "Daily Return"]}
                          labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Daily Return" 
                          stroke="#0EA5E9" 
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="trades" className="mt-0">
                  <div className="space-y-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={backtestResult.trades.filter(t => t.type === 'sell' && t.profit !== undefined)}
                          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => format(new Date(date), 'MMM d')}
                          />
                          <YAxis 
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            formatter={(value) => [formatCurrency(Number(value)), "Profit/Loss"]}
                            labelFormatter={(label) => format(new Date(label as string), 'MMM d, yyyy')}
                          />
                          <Bar 
                            dataKey="profit" 
                            name="Profit/Loss" 
                            fill={(data) => (data && data > 0) ? "#34D399" : "#EF4444"}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 px-4 font-medium">Date</th>
                            <th className="py-2 px-4 font-medium">Type</th>
                            <th className="py-2 px-4 font-medium text-right">Price</th>
                            <th className="py-2 px-4 font-medium text-right">Quantity</th>
                            <th className="py-2 px-4 font-medium text-right">Profit/Loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtestResult.trades.map((trade, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2 px-4">{format(new Date(trade.date), 'MMM d, yyyy')}</td>
                              <td className="py-2 px-4">
                                <span className={trade.type === 'buy' ? 'text-trading-highlight' : 'text-trading-profit'}>
                                  {trade.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right">{formatCurrency(trade.price)}</td>
                              <td className="py-2 px-4 text-right">{trade.quantity}</td>
                              <td className="py-2 px-4 text-right">
                                {trade.profit !== undefined ? (
                                  <span className={trade.profit > 0 ? 'text-trading-profit' : 'text-trading-loss'}>
                                    {formatCurrency(trade.profit)}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
