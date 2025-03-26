
import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API, Strategy } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Code, Trash2, Plus, Save, ArrowRight, Bookmark, Settings } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";

interface StrategyParam {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export default function StrategyBuilder() {
  const [tabValue, setTabValue] = useState("templates");
  const [strategyName, setStrategyName] = useState("");
  const [strategyDescription, setStrategyDescription] = useState("");
  const [strategyParams, setStrategyParams] = useState<StrategyParam[]>([]);
  const [strategyCode, setStrategyCode] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Fetch available strategies as templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['strategies'],
    queryFn: API.getAvailableStrategies,
  });

  // Reference to the new parameter form
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  // Load template
  const handleLoadTemplate = () => {
    const template = templates.find((t: Strategy) => t.id === selectedTemplate);
    if (template) {
      setStrategyName(template.name);
      setStrategyDescription(template.description);
      setStrategyParams(template.params);
      // Generate sample code based on template
      const sampleCode = generateSampleCode(template.name, template.params);
      setStrategyCode(sampleCode);
      setTabValue("customize");
      toast.success(`Loaded ${template.name} template`);
    }
  };

  // Add a new parameter
  const handleAddParam = () => {
    if (!nameRef.current?.value) {
      toast.error("Parameter name is required");
      return;
    }

    const newParam: StrategyParam = {
      name: nameRef.current.value,
      type: (typeRef.current?.value as 'number' | 'boolean' | 'string' | 'select') || 'number',
      value: typeRef.current?.value === 'number' ? 0 : '',
      description: descriptionRef.current?.value || ''
    };

    if (newParam.type === 'number') {
      newParam.min = 0;
      newParam.max = 100;
      newParam.step = 1;
    }

    setStrategyParams([...strategyParams, newParam]);
    
    // Reset form
    if (nameRef.current) nameRef.current.value = '';
    if (descriptionRef.current) descriptionRef.current.value = '';
  };

  // Remove a parameter
  const handleRemoveParam = (index: number) => {
    const updatedParams = [...strategyParams];
    updatedParams.splice(index, 1);
    setStrategyParams(updatedParams);
  };

  // Update parameter
  const handleUpdateParam = (index: number, field: string, value: any) => {
    const updatedParams = [...strategyParams];
    (updatedParams[index] as any)[field] = value;
    setStrategyParams(updatedParams);
  };

  // Generate sample code based on strategy parameters
  const generateSampleCode = (name: string, params: StrategyParam[]) => {
    const className = name.replace(/\s+/g, '');
    const paramDeclarations = params.map(p => `        self.${p.name} = ${p.value}`).join('\n');
    const paramUsage = params.map(p => `            # Using ${p.name}: ${p.description}`).join('\n');

    return `import backtrader as bt

class ${className}(bt.Strategy):
    params = (
${params.map(p => `        ('${p.name}', ${p.value}),`).join('\n')}
    )
    
    def __init__(self):
${paramDeclarations}
        self.sma_fast = bt.indicators.SMA(period=self.fast_period)
        self.sma_slow = bt.indicators.SMA(period=self.slow_period)
        self.crossover = bt.indicators.CrossOver(self.sma_fast, self.sma_slow)
        
    def next(self):
        if not self.position:
            if self.crossover > 0:
${paramUsage}
                self.buy(size=100)
        elif self.crossover < 0:
            self.close()`;
  };

  // Save strategy
  const handleSaveStrategy = () => {
    if (!strategyName) {
      toast.error("Strategy name is required");
      return;
    }
    
    if (strategyParams.length === 0) {
      toast.error("At least one parameter is required");
      return;
    }
    
    toast.success(`Strategy "${strategyName}" saved successfully`);
    
    // In a real app, you would send this to the backend
    console.log({
      name: strategyName,
      description: strategyDescription,
      params: strategyParams,
      code: strategyCode
    });
  };

  // Switch to code view and update code
  const handleShowCode = () => {
    setTabValue("code");
    setStrategyCode(generateSampleCode(strategyName || "CustomStrategy", strategyParams));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-medium">Strategy Builder</h1>
            <p className="text-muted-foreground mt-1">Create and customize your trading strategies</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleSaveStrategy}
              disabled={!strategyName || strategyParams.length === 0}
            >
              <Save className="h-4 w-4" />
              Save Strategy
            </Button>
            <Link to="/backtest">
              <Button className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Test Strategy
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Templates</CardTitle>
                <CardDescription>
                  Choose a pre-built strategy template as a starting point
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template">Select Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template: Strategy) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div className="p-4 border rounded-md bg-muted/40">
                      <h3 className="font-medium mb-2">
                        {templates.find((t: Strategy) => t.id === selectedTemplate)?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {templates.find((t: Strategy) => t.id === selectedTemplate)?.description}
                      </p>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Parameters:</h4>
                        <ul className="text-sm space-y-1 list-disc pl-5">
                          {templates
                            .find((t: Strategy) => t.id === selectedTemplate)
                            ?.params.map((param) => (
                              <li key={param.name}>
                                <span className="font-medium">{param.name}</span>: {param.description}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t pt-6">
                <Button
                  onClick={handleLoadTemplate}
                  disabled={!selectedTemplate}
                  className="gap-2"
                >
                  <Bookmark className="h-4 w-4" />
                  Use Template
                </Button>
              </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>From Scratch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Build a completely custom strategy from the ground up
                  </p>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setStrategyName("");
                      setStrategyDescription("");
                      setStrategyParams([]);
                      setStrategyCode("");
                      setTabValue("customize");
                    }}
                  >
                    Create New
                  </Button>
                </CardFooter>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Import</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Import a strategy from a file or code snippet
                  </p>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setTabValue("code");
                      toast.info("Paste your code in the editor");
                    }}
                  >
                    Import Code
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="strategyName">Strategy Name</Label>
                    <Input
                      id="strategyName"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      placeholder="E.g., SMA Crossover Strategy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategyDescription">Description</Label>
                    <Textarea
                      id="strategyDescription"
                      value={strategyDescription}
                      onChange={(e) => setStrategyDescription(e.target.value)}
                      placeholder="Describe how your strategy works..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Strategy Parameters</CardTitle>
                <CardDescription>
                  Define the parameters that will control your strategy's behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Parameters List */}
                {strategyParams.length > 0 ? (
                  <div className="space-y-4">
                    <Accordion type="multiple" className="w-full">
                      {strategyParams.map((param, index) => (
                        <AccordionItem key={index} value={`param-${index}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <span>{param.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-muted rounded-full">
                                  {param.type}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {typeof param.value === 'number' ? param.value : (param.value || 'Empty')}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={param.name}
                                  onChange={(e) => handleUpdateParam(index, 'name', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={param.type}
                                  onValueChange={(v) => handleUpdateParam(index, 'type', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="select">Select</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Default Value</Label>
                                {param.type === 'number' ? (
                                  <Input
                                    type="number"
                                    value={param.value}
                                    onChange={(e) => handleUpdateParam(index, 'value', Number(e.target.value))}
                                  />
                                ) : param.type === 'boolean' ? (
                                  <Select
                                    value={param.value ? 'true' : 'false'}
                                    onValueChange={(v) => handleUpdateParam(index, 'value', v === 'true')}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">True</SelectItem>
                                      <SelectItem value="false">False</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={param.value}
                                    onChange={(e) => handleUpdateParam(index, 'value', e.target.value)}
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                  value={param.description}
                                  onChange={(e) => handleUpdateParam(index, 'description', e.target.value)}
                                />
                              </div>
                              {param.type === 'number' && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Min Value</Label>
                                    <Input
                                      type="number"
                                      value={param.min}
                                      onChange={(e) => handleUpdateParam(index, 'min', Number(e.target.value))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Max Value</Label>
                                    <Input
                                      type="number"
                                      value={param.max}
                                      onChange={(e) => handleUpdateParam(index, 'max', Number(e.target.value))}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveParam(index)}
                                className="gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No parameters defined yet</p>
                    <p className="text-sm">Add parameters to customize your strategy</p>
                  </div>
                )}

                {/* Add Parameter Form */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Add New Parameter</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paramName">Parameter Name</Label>
                      <Input 
                        id="paramName" 
                        ref={nameRef} 
                        placeholder="E.g., fast_period"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paramType">Type</Label>
                      <Select defaultValue="number">
                        <SelectTrigger id="paramType" ref={typeRef}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="paramDescription">Description</Label>
                      <Input 
                        id="paramDescription" 
                        ref={descriptionRef} 
                        placeholder="E.g., Period for the fast SMA"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleAddParam} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Parameter
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setTabValue("templates")}
                >
                  Back to Templates
                </Button>
                <Button 
                  onClick={handleShowCode} 
                  disabled={strategyParams.length === 0}
                  className="gap-2"
                >
                  <Code className="h-4 w-4" />
                  View Code
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Code Tab */}
          <TabsContent value="code" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Code</CardTitle>
                <CardDescription>
                  Review and edit the Python code for your strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea
                    value={strategyCode}
                    onChange={(e) => setStrategyCode(e.target.value)}
                    className="h-[500px] font-mono text-sm p-4 bg-muted/50"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setTabValue("customize")}
                >
                  Back to Parameters
                </Button>
                <Button onClick={handleSaveStrategy} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Strategy
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
