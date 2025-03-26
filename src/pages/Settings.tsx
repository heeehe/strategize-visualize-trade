
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { API } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, CheckCircle } from "lucide-react";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch API keys
  const { data: apiKeys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: API.getApiKeys,
    onSuccess: (data) => {
      if (data.apiKey && data.secretKey) {
        setApiKey(data.apiKey);
        setSecretKey(data.secretKey);
      }
    }
  });

  // Check for dark mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDarkMode(
        window.matchMedia("(prefers-color-scheme: dark)").matches ||
        document.documentElement.classList.contains("dark")
      );
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  // Save API keys
  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    try {
      const success = await API.saveApiKeys(apiKey, secretKey);
      if (success) {
        toast.success("API keys saved successfully");
      } else {
        toast.error("Failed to save API keys");
      }
    } catch (error) {
      toast.error("An error occurred while saving API keys");
    } finally {
      setIsSaving(false);
    }
  };

  // Save preferences
  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully");
    
    // In a real app, this would be persisted to localStorage or a backend
    console.log({
      isDarkMode,
      autoRefresh,
      refreshInterval
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        <h1 className="text-3xl font-medium">Settings</h1>
        
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value="user@example.com" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value="trader123" readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h3 className="font-medium">Free Plan</h3>
                    <p className="text-sm text-muted-foreground">Basic features with limitations</p>
                  </div>
                  <Button>Upgrade</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alpaca API Keys</CardTitle>
                <CardDescription>
                  Configure your Alpaca API keys for trading
                </CardDescription>
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
                
                <div className="p-4 bg-muted rounded-md text-sm">
                  <p className="font-medium mb-2">How to get your Alpaca API keys:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Create an account on <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-primary underline">Alpaca</a></li>
                    <li>Navigate to Paper Trading in your dashboard</li>
                    <li>Generate API keys for paper trading</li>
                    <li>Copy and paste the keys here</li>
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <div className="flex items-center text-sm">
                  {apiKey && secretKey && (
                    <div className="flex items-center gap-2 text-trading-profit">
                      <CheckCircle className="h-4 w-4" />
                      <span>API keys configured</span>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleSaveApiKeys} 
                  disabled={isSaving || (!apiKey || !secretKey)}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Keys
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark theme
                    </p>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={isDarkMode}
                    onCheckedChange={toggleDarkMode}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Data Refresh Settings</CardTitle>
                <CardDescription>
                  Configure how frequently data is refreshed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRefresh">Auto-Refresh</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh data at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="autoRefresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                </div>
                
                {autoRefresh && (
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <div className="flex gap-4 items-center">
                      <Input
                        id="refreshInterval"
                        type="number"
                        min={1}
                        max={60}
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      />
                      <span className="text-sm text-muted-foreground w-24">
                        {refreshInterval} seconds
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-6">
                <Button onClick={handleSavePreferences}>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
