import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, Strategy, Symbol } from "@/services/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Play, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { max } from "date-fns";

export default function Live() {
  const [symbol, setSymbol] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [keysSaved, setKeysSaved] = useState(false);
  const [accountDetails, setAccountDetails] = useState(null);
  const [selectedSector, setSelectedSector] = useState("");
  const [maxCapital, setMaxCapital] = useState(0);

  // Fetch available symbols
  const { data: symbols = [], isLoading: isLoadingSymbols } = useQuery({
    queryKey: ['symbols'],
    queryFn: API.getAvailableSymbols,
  });

  const sector_stocks = {
    "Banking & Financial Services": {
      "IDBI": 377857,
      "SOUTHBANK": 1522689,
      "IOB": 2393089,
      "PNB": 2730497,
      "CANBK": 2763265,
      "IDFCFIRSTB": 2863105,
      "UCOBANK": 2873089,
      "MAHABANK": 2912513,
      "YESBANK": 3050241,
      "CENTRALBK": 3812865,
      "PSB": 5376257
    },
    "Energy & Power": {
      "NLCINDIA": 2197761,
      "JPPOWER": 3011329,
      "SUZLON": 3076609,
      "RENUKA": 3078657,
      "RPOWER": 3906305,
      "NHPC": 4454401,
      "SJVN": 4834049
    },
    "Infrastructure & Engineering": {
      "NCC": 593665,
      "PNCINFRA": 2402561,
      "TARMAT": 3781377,
      "KNRCON": 3912449,
      "IRB": 3920129,
      "ASHOKA": 5166593,
      "SALASAR": 5468673,
      "NBCC": 8042241
    },
    "Chemicals & Specialty Materials": {
      "GHCL": 288513,
      "NOCIL": 625153,
      "PIDILITIND": 681985,
      "SRF": 837889,
      "IGL": 2883073,
      "KIRIINDUS": 4259585,
      "VIKASECO": 6593537
    },
    "Iron & Steel": {
      "HITECH": 734209,
      "SAIL": 758529,
      "TATASTEEL": 895745,
      "JINDALSTEL": 1723649,
      "RAMASTEEL": 2636801,
      "MUKANDLTD": 2899201,
      "JSWSTEEL": 3001089,
      "MSPL": 3051265
    },
    "FMCG & Consumer Goods": {
      "ADOR": 8705,
      "BCLIND": 643329,
      "HATSUN": 996353,
      "HERITGFOOD": 1177089,
      "VADILALIND": 6194177
    },
    "Textiles & Manufacturing": {
      "ARVIND": 49409,
      "RAYMOND": 731905,
      "SRF": 837889,
      "VARDMNPOLY": 933377,
      "TRIDENT": 2479361,
      "PAGEIND": 3689729,
      "KPRMILL": 3817473
    },
    "Logistics & Transport": {
      "MAHLOG": 98561,
      "BLUEDART": 126721,
      "CONCOR": 1215745,
      "VRLLOG": 2226177,
      "NAVKARCORP": 2702593,
      "TCI": 2708481,
      "ALLCARGO": 3456257
    },
    "Real Estate": {
      "MAHLIFE": 2060801,
      "SOBHA": 3539457,
      "PHOENIXLTD": 3725313,
      "DLF": 3771393,
      "BRIGADE": 3887105,
      "SUNTECK": 4516097,
      "GODREJPROP": 4576001,
      "OBEROIRLTY": 5181953,
      "PRESTIGE": 5197313
    }
  }


  // Fetch available strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: API.getAvailableStrategies,
  });

  // Fetch API keys
  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: API.getApiKeys,
    onSuccess: (data) => {
      if (data.apiKey && data.secretKey) {
        setApiKey(data.apiKey);
        setSecretKey(data.secretKey);
        setKeysSaved(true);
      }
    }
  });

  // Fetch trading status
  const { data: tradingStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['tradingStatus'],
    queryFn: API.getTradingStatus,
    refetchInterval: keysSaved ? 5000 : false,
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

  // Save API keys mutation
  const { mutate: saveApiKeys, isPending: isSavingKeys } = useMutation({
    mutationFn: () => API.saveApiKeys(apiKey, secretKey),
    onSuccess: (success) => {
      if (success) {
        toast.success("API keys saved successfully");
        setKeysSaved(true);
      } else {
        toast.error("Failed to save API keys");
      }
    },
  });
  const { mutate: validateApiKeys, isPending: isValidatingKeys } = useMutation({
    mutationFn: async () => {
      return API.validateApiKeys(apiKey, secretKey); // Call API to validate keys
    },
    onSuccess: (url) => {
      console.log(url)
      window.open(url);

    },
    onError: () => {
      toast.error("Error validating API keys. Try again later.");
    },
  });

  // Start trading mutation
  const { mutate: startTrading, isPending: isStarting } = useMutation({
    mutationFn: () => {
      if (!selectedSector || !strategyId || maxCapital <= 0) {
        toast.error("Please fill in all required fields");
        return Promise.reject();
      }
      // Only send the required three parameters
      return API.startLiveTrading(selectedSector, strategyId, maxCapital);
    },
    onSuccess: (success) => {
      if (success) {
        refetchStatus();
      }
    },
  });

  // Stop trading mutation
  const { mutate: stopTrading, isPending: isStopping } = useMutation({
    mutationFn: API.stopLiveTrading,
    onSuccess: (success) => {
      if (success) {
        refetchStatus();
      }
    },
  });

  // Add this function inside your Live component
  function handleZerodhaCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
      // Get request_token from URL params
      const requestToken = searchParams.get("request_token");
      const status = searchParams.get("status");

      // Retrieve apiKey and secretKey from local storage
      const apiKey = localStorage.getItem("apiKey");
      const secretKey = localStorage.getItem("secretKey");

      // Check if this is a Zerodha callback
      if (requestToken && status === "success" && apiKey && secretKey) {
        axios
          .post("http://localhost:3000/zerodha/callback", {
            request_token: requestToken,
            apiKey,
            secretKey,
          })
          .then((response) => {
            const { accessToken, accountDetails } = response.data;

            // Save accessToken in local storage
            if (accessToken) {
              localStorage.setItem("accessToken", accessToken);
              setAccountDetails(accountDetails); // Save account details in state
              toast.success("Successfully authenticated with Zerodha");
            } else {
              toast.error("Access token not received from backend");
            }

            // Clean up URL by removing query parameters
            navigate("/live", { replace: true });
          })
          .catch((error) => {
            toast.error("Failed to authenticate with Zerodha");
            console.error("Zerodha authentication error:", error);
          });
      }
    }, [searchParams, navigate]);
  }

  // Add this near the top of your component
  handleZerodhaCallback();

  return (
    <Layout className="relative">
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-medium">Live Trading</h1>
            <p className="text-muted-foreground mt-1">Deploy and monitor your trading strategies in real-time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Trading Status Card */}
            {/* <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Trading Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStatus ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tradingStatus?.isActive ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-trading-profit rounded-full animate-pulse" />
                      <span className="text-xl font-medium">Trading Active</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Symbol</div>
                          <div className="font-medium text-lg">{tradingStatus.symbol}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Strategy</div>
                          <div className="font-medium text-lg">{tradingStatus.strategy}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Started</div>
                          <div className="font-medium">
                            {tradingStatus.startTime ? new Date(tradingStatus.startTime).toLocaleString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Current Position</div>
                          <div className="font-medium text-lg">
                            {tradingStatus.position?.type === 'long' ? (
                              <span className="text-trading-profit">LONG</span>
                            ) : tradingStatus.position?.type === 'short' ? (
                              <span className="text-trading-loss">SHORT</span>
                            ) : (
                              <span className="text-trading-neutral">NO POSITION</span>
                            )}
                          </div>
                        </div>
                        
                        {tradingStatus.position?.type !== 'none' && (
                          <>
                            <div>
                              <div className="text-sm text-muted-foreground">Quantity</div>
                              <div className="font-medium text-lg">{tradingStatus.position?.quantity} shares</div>
                            </div>
                            {tradingStatus.position?.entryPrice && (
                              <div>
                                <div className="text-sm text-muted-foreground">Entry Price</div>
                                <div className="font-medium text-lg">
                                  ${tradingStatus.position?.entryPrice.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="destructive" 
                        onClick={() => stopTrading()}
                        disabled={isStopping}
                        className="gap-2"
                      >
                        {isStopping ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Stopping...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Stop Trading
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-muted-foreground rounded-full" />
                      <span className="text-xl font-medium">Trading Inactive</span>
                    </div>
                    <p className="text-muted-foreground">
                      Configure your strategy and start trading to see live results here.
                    </p>
                    
                    <div className="flex justify-end">
                      {!keysSaved ? (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Please add your Alpaca API keys first</span>
                        </div>
                      ) : (
                        <Link to="/backtest">
                          <Button variant="outline">
                            Run Backtest First
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card> */}

            {/* Trading Configuration */}
            {/* {!tradingStatus?.isActive && ( */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Trading Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Symbol Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select value={selectedSector} onValueChange={(value) => {
                      setSelectedSector(value);
                      setSymbol(""); // Clear selected symbol when sector changes
                    }}>
                      <SelectTrigger id="sector">
                        <SelectValue placeholder="Select a Sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(sector_stocks).map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* if you want to select a particular stock  */}
                    {/* {selectedSector && (
                      <div className="mt-4">
                        <Label htmlFor="stock">Stock</Label>
                        <Select value={symbol} onValueChange={setSymbol}>
                          <SelectTrigger id="stock">
                            <SelectValue placeholder="Select a Stock" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(sector_stocks[selectedSector]).map(([stockSymbol, id]) => (
                              <SelectItem key={stockSymbol} value={stockSymbol}>
                                {stockSymbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )} */}
                  </div>

                  {/* Strategy Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select value={strategyId} onValueChange={handleStrategyChange}>
                      <SelectTrigger id="strategy">
                        <SelectValue placeholder="Select a strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tejaswi-Strategy">
                          Tejaswi-Strategy
                        </SelectItem>

                        {/* {isLoadingStrategies ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          strategies.map((s: Strategy) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))
                        } */}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Maximum Capital  */}
                  <div className="space-y-2">
                    <Label htmlFor="capital">Maximum Capital</Label>
                    <Input
                      id="capital"
                      type="number"
                      placeholder="Enter maximum capital"
                      value={maxCapital}
                      onChange={(e) => setMaxCapital(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Strategy Parameters */}
                {selectedStrategy && selectedStrategy.params.length > 0 && (
                  <>
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-medium mb-4">Strategy Parameters</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedStrategy.params.map((param) => (
                          <div key={param.name} className="space-y-2">
                            <Label htmlFor={param.name}>
                              {param.name.replace(/_/g, ' ')}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {param.description}
                              </span>
                            </Label>
                            {param.type === 'number' ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  id={param.name}
                                  type="number"
                                  min={param.min}
                                  max={param.max}
                                  step={param.step || 1}
                                  value={maxCapital || ''}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (value <= 0) {
                                      toast.error("Capital must be greater than 0");
                                      return;
                                    }
                                    setMaxCapital(value);
                                  }}
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
                    onClick={() => startTrading()}
                    disabled={!selectedSector || !strategyId || maxCapital<=0 }
                    className="gap-2"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start Trading
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* )} */}
          </div>

          {/* API Configuration */}
          {/* <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Alpaca API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your Alpaca API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Your Alpaca secret key"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  {keysSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-trading-profit" />
                      <span className="text-sm text-trading-profit">API keys saved</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-500">API keys required</span>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => {validateApiKeys()}}
                  disabled={isSavingKeys || (!apiKey || !secretKey)}
                  size="sm"
                >
                  {isSavingKeys ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Keys'
                  )}
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">How to get API Keys:</h3>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                  <li>Create an account on <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-primary underline">Alpaca</a></li>
                  <li>Navigate to Paper Trading in your dashboard</li>
                  <li>Generate API keys for paper trading</li>
                  <li>Copy and paste the keys here</li>
                </ol>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Note:</strong> We recommend starting with Paper Trading to test your strategies without risking real money.
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Zerodha API Configuration */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Zerodha API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your Zerodha API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Your Zerodha secret key"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  {keysSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-trading-profit" />
                      <span className="text-sm text-trading-profit">API keys saved</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-500">API keys required</span>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => validateApiKeys()}
                  disabled={isSavingKeys || (!apiKey || !secretKey)}
                  size="sm"
                >
                  {isSavingKeys ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Keys'
                  )}
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">How to get API Keys:</h3>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
                  <li>Create an account on <a href="https://kite.trade/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Zerodha Kite Connect</a></li>
                  <li>Generate API and Secret keys from the developer console</li>
                  <li>Copy and paste the keys here</li>
                </ol>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Note:</strong> Ensure you have subscribed to the Kite Connect API to use these keys.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zerodha Account Details */}
          {/* <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Zerodha Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {accountDetails ? (
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <p>{accountDetails.user_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Account Balance</Label>
                    <p>{accountDetails.balance ? `₹${accountDetails.balance}` : "N/A"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p>{accountDetails.email || "N/A"}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Your Zerodha API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Your Zerodha secret key"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      {keysSaved ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-trading-profit" />
                          <span className="text-sm text-trading-profit">API keys saved</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-amber-500">API keys required</span>
                        </>
                      )}
                    </div>
                    <Button
                      onClick={() => validateApiKeys()}
                      disabled={isSavingKeys || (!apiKey || !secretKey)}
                      size="sm"
                    >
                      {isSavingKeys ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Keys'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card> */}
        </div>
      </div>
    </Layout>
  );
}