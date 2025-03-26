
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Play, 
  History, 
  Zap,
  ArrowRight,
  Activity
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API, PerformanceData } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

export default function Index() {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0,
    tradesCount: 0
  });

  // Fetch trading status
  const { data: tradingStatus } = useQuery({
    queryKey: ['tradingStatus'],
    queryFn: API.getTradingStatus,
    refetchInterval: 30000,
  });
  
  useEffect(() => {
    // Simulate fetching performance data
    setTimeout(() => {
      setPerformanceData({
        totalReturn: 12.4,
        sharpeRatio: 1.8,
        maxDrawdown: -8.2,
        winRate: 65,
        tradesCount: 32
      });
    }, 800);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-12">
        {/* Hero Section */}
        <section className="relative rounded-2xl p-8 overflow-hidden glass-morphism animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl font-medium mb-4 animate-slide-down opacity-0" style={{ animationDelay: '0.1s' }}>
              Strategize. Visualize. Trade.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 animate-slide-down opacity-0" style={{ animationDelay: '0.2s' }}>
              Build, backtest, and deploy algorithmic trading strategies with an intuitive interface.
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-down opacity-0" style={{ animationDelay: '0.3s' }}>
              <Link to="/backtest">
                <Button size="lg" className="gap-2">
                  Start Backtesting <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/strategy">
                <Button size="lg" variant="outline" className="gap-2">
                  Build a Strategy <Zap className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Status Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold">{performanceData.totalReturn}%</span>
                {performanceData.totalReturn > 0 ? 
                  <TrendingUp className="text-trading-profit h-6 w-6" /> : 
                  <TrendingDown className="text-trading-loss h-6 w-6" />
                }
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold">{performanceData.sharpeRatio.toFixed(2)}</span>
                <BarChart3 className="text-trading-highlight h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold">{performanceData.winRate}%</span>
                <TrendingUp className="text-trading-profit h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.5s' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Max Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold">{performanceData.maxDrawdown}%</span>
                <TrendingDown className="text-trading-loss h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Live Trading Status */}
        <section>
          <h2 className="text-2xl font-medium mb-6">Trading Status</h2>
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.6s' }}>
            <CardContent className="p-6">
              {tradingStatus?.isActive ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-trading-profit animate-pulse" />
                      <span className="font-medium">Live Trading Active</span>
                    </div>
                    <p className="text-muted-foreground">
                      Trading {tradingStatus.symbol} with {tradingStatus.strategy} strategy
                    </p>
                    {tradingStatus.position?.type !== 'none' && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className={tradingStatus.position?.type === 'long' ? 'text-trading-profit' : 'text-trading-loss'}>
                          {tradingStatus.position?.type.toUpperCase()}
                        </span>
                        <span>{tradingStatus.position?.quantity} shares</span>
                        {tradingStatus.position?.entryPrice && (
                          <span>@ ${tradingStatus.position?.entryPrice.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/live">
                      <Button variant="outline" className="gap-2">
                        <Activity className="w-4 h-4" /> View Details
                      </Button>
                    </Link>
                    <Button 
                      variant="destructive" 
                      className="gap-2"
                      onClick={() => API.stopLiveTrading()}
                    >
                      Stop Trading
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                      <span className="font-medium">No Active Trading</span>
                    </div>
                    <p className="text-muted-foreground">
                      Start live trading with your backtested strategy
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link to="/backtest">
                      <Button variant="outline" className="gap-2">
                        <History className="w-4 h-4" /> Backtest First
                      </Button>
                    </Link>
                    <Link to="/live">
                      <Button className="gap-2">
                        <Play className="w-4 h-4" /> Start Trading
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity or Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle>Backtest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Rigorously test your strategies against historical data before risking real capital.
              </p>
              <Link to="/backtest">
                <Button variant="outline" className="w-full">
                  Run Backtest
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.8s' }}>
            <CardHeader>
              <CardTitle>Strategy Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create and refine your trading strategies with our intuitive strategy builder.
              </p>
              <Link to="/strategy">
                <Button variant="outline" className="w-full">
                  Build Strategy
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm animate-slide-up opacity-0" style={{ animationDelay: '0.9s' }}>
            <CardHeader>
              <CardTitle>Live Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Deploy your strategies to the market with paper or live trading through Alpaca.
              </p>
              <Link to="/live">
                <Button variant="outline" className="w-full">
                  Start Trading
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
