import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Brain, Cpu, Target, Shield, Zap, FileText, Activity, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AgentConfig {
  id: string;
  agentId: string;
  aiModel: string;
  modelName: string;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  fineTuningRules: {
    customInstructions: string[];
    restrictedActions: string[];
    priorityKeywords: string[];
    responseFormat: string;
  };
  isActive: boolean;
}

const AGENTS = [
  {
    id: "anomaly-detector-001",
    name: "Anomaly Detection Agent",
    description: "Detects unusual patterns in server metrics using AI analysis",
    icon: Activity,
    color: "text-red-500",
    defaultPrompt: "You are an expert system administrator with 20+ years experience monitoring financial infrastructure. Analyze metrics with precision and provide actionable insights about anomalies, unusual patterns, and system health issues."
  },
  {
    id: "recommendation-engine-001", 
    name: "Recommendation Engine",
    description: "Generates intelligent remediation recommendations",
    icon: Target,
    color: "text-blue-500",
    defaultPrompt: "You are an expert DevOps engineer specializing in financial infrastructure. Analyze alerts and provide intelligent remediation recommendations with detailed risk assessments and implementation steps."
  },
  {
    id: "predictive-analytics-001",
    name: "Predictive Analytics Agent", 
    description: "Forecasts future system performance and resource needs",
    icon: Brain,
    color: "text-purple-500",
    defaultPrompt: "You are a data scientist specializing in infrastructure forecasting. Provide accurate predictions with confidence intervals for CPU, memory, disk, and network metrics based on historical patterns."
  },
  {
    id: "approval-compliance-001",
    name: "Approval & Compliance Agent",
    description: "Manages approval workflows and compliance checks",
    icon: Shield,
    color: "text-green-500", 
    defaultPrompt: "You are a risk assessment expert for financial infrastructure. Be conservative with high-risk operations and provide detailed compliance analysis for all remediation actions."
  },
  {
    id: "telemetry-collector-001",
    name: "Telemetry Collector Agent",
    description: "Gathers server metrics every 30 seconds",
    icon: Cpu,
    color: "text-cyan-500",
    defaultPrompt: "You are a telemetry collection specialist. Focus on accurate data gathering, validation of metrics integrity, and ensuring comprehensive monitoring coverage of all system components."
  },
  {
    id: "remediation-executor-001",
    name: "Remediation Executor Agent", 
    description: "Executes approved automated fixes",
    icon: Zap,
    color: "text-orange-500",
    defaultPrompt: "You are an automation execution expert for financial infrastructure. Execute approved remediation actions with precision, monitoring for safety conditions and rollback capabilities."
  },
  {
    id: "audit-reporting-001",
    name: "Audit & Reporting Agent",
    description: "Maintains compliance logs and generates reports",
    icon: FileText,
    color: "text-yellow-500",
    defaultPrompt: "You are a compliance and audit specialist for financial systems. Maintain detailed audit trails, generate comprehensive reports, and ensure all activities meet regulatory requirements."
  }
];

const AI_MODELS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic Claude", models: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022"] }
];

export default function AgentSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].id);
  const [saving, setSaving] = useState<string | null>(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["/api/agent-settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (config: Partial<AgentConfig>) => {
      return apiRequest("/api/agent-settings", {
        method: "PUT",
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-settings"] });
      toast({
        title: "Settings Updated",
        description: "Agent configuration saved successfully.",
      });
      setSaving(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save agent settings.",
        variant: "destructive",
      });
      setSaving(null);
    }
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest(`/api/agent-settings/${agentId}/reset`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-settings"] });
      toast({
        title: "Settings Reset",
        description: "Agent configuration reset to defaults.",
      });
    },
  });

  const agent = AGENTS.find(a => a.id === selectedAgent);
  const agentConfig = settings.find((s: AgentConfig) => s.agentId === selectedAgent) || {
    agentId: selectedAgent,
    aiModel: "openai",
    modelName: "gpt-4o", 
    temperature: 0.1,
    systemPrompt: agent?.defaultPrompt || "",
    maxTokens: 1000,
    frequencyPenalty: 0,
    presencePenalty: 0,
    fineTuningRules: {
      customInstructions: [],
      restrictedActions: [],
      priorityKeywords: [],
      responseFormat: "json"
    },
    isActive: true
  };

  const handleSave = (config: Partial<AgentConfig>) => {
    setSaving(selectedAgent);
    updateSettingsMutation.mutate({ ...agentConfig, ...config });
  };

  const handleReset = () => {
    resetToDefaultsMutation.mutate(selectedAgent);
  };

  const selectedModel = AI_MODELS.find(m => m.value === agentConfig.aiModel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">AI Agent Settings</h1>
          <p className="text-muted-foreground">Configure AI models, prompts, and fine-tuning rules for each agent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent Selection Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Select Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              const config = settings.find((s: AgentConfig) => s.agentId === agent.id);
              const isActive = config?.isActive !== false;
              
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedAgent === agent.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-border hover:bg-accent'
                  }`}
                  data-testid={`button-select-agent-${agent.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${agent.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{agent.name}</p>
                        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {agent && <agent.icon className={`h-6 w-6 ${agent.color}`} />}
                <div>
                  <CardTitle>{agent?.name}</CardTitle>
                  <CardDescription>{agent?.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={resetToDefaultsMutation.isPending}
                  data-testid="button-reset-defaults"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Switch
                  checked={agentConfig.isActive}
                  onCheckedChange={(checked) => handleSave({ isActive: checked })}
                  data-testid="switch-agent-active"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="model" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="model" data-testid="tab-model">AI Model</TabsTrigger>
                <TabsTrigger value="prompt" data-testid="tab-prompt">System Prompt</TabsTrigger>
                <TabsTrigger value="parameters" data-testid="tab-parameters">Parameters</TabsTrigger>
                <TabsTrigger value="fine-tuning" data-testid="tab-fine-tuning">Fine Tuning</TabsTrigger>
              </TabsList>

              <TabsContent value="model" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">AI Provider</Label>
                    <Select 
                      value={agentConfig.aiModel} 
                      onValueChange={(value) => {
                        const newModel = AI_MODELS.find(m => m.value === value);
                        handleSave({ 
                          aiModel: value,
                          modelName: newModel?.models[0] || "gpt-4o"
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-ai-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model-name">Model Version</Label>
                    <Select 
                      value={agentConfig.modelName} 
                      onValueChange={(value) => handleSave({ modelName: value })}
                    >
                      <SelectTrigger data-testid="select-model-version">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedModel?.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-accent rounded-lg">
                  <h4 className="font-medium mb-2">Model Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="ml-2 font-medium">{selectedModel?.label}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <span className="ml-2 font-medium">{agentConfig.modelName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={agentConfig.isActive ? "default" : "secondary"} className="ml-2">
                        {agentConfig.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prompt" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Enter the system prompt for this agent..."
                    value={agentConfig.systemPrompt}
                    onChange={(e) => handleSave({ systemPrompt: e.target.value })}
                    className="min-h-[200px]"
                    data-testid="textarea-system-prompt"
                  />
                  <p className="text-sm text-muted-foreground">
                    This prompt defines the agent's role, expertise, and behavior. Be specific about the context and expected outputs.
                  </p>
                </div>

                <Button 
                  onClick={() => handleSave({ systemPrompt: agent?.defaultPrompt || "" })}
                  variant="outline"
                  size="sm"
                  data-testid="button-restore-default-prompt"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restore Default Prompt
                </Button>
              </TabsContent>

              <TabsContent value="parameters" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature ({agentConfig.temperature})</Label>
                    <Input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={agentConfig.temperature}
                      onChange={(e) => handleSave({ temperature: parseFloat(e.target.value) })}
                      data-testid="input-temperature"
                    />
                    <p className="text-xs text-muted-foreground">Controls randomness. Lower = more focused, Higher = more creative</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min="100"
                      max="8000"
                      value={agentConfig.maxTokens}
                      onChange={(e) => handleSave({ maxTokens: parseInt(e.target.value) })}
                      data-testid="input-max-tokens"
                    />
                    <p className="text-xs text-muted-foreground">Maximum response length</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency-penalty">Frequency Penalty ({agentConfig.frequencyPenalty})</Label>
                    <Input
                      id="frequency-penalty"
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={agentConfig.frequencyPenalty}
                      onChange={(e) => handleSave({ frequencyPenalty: parseFloat(e.target.value) })}
                      data-testid="input-frequency-penalty"
                    />
                    <p className="text-xs text-muted-foreground">Reduces repetition of frequent tokens</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="presence-penalty">Presence Penalty ({agentConfig.presencePenalty})</Label>
                    <Input
                      id="presence-penalty"
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={agentConfig.presencePenalty}
                      onChange={(e) => handleSave({ presencePenalty: parseFloat(e.target.value) })}
                      data-testid="input-presence-penalty"
                    />
                    <p className="text-xs text-muted-foreground">Encourages talking about new topics</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fine-tuning" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Custom Instructions</Label>
                    <Textarea
                      placeholder="Additional instructions for this agent..."
                      value={agentConfig.fineTuningRules?.customInstructions?.join('\n') || ''}
                      onChange={(e) => handleSave({ 
                        fineTuningRules: {
                          ...agentConfig.fineTuningRules,
                          customInstructions: e.target.value.split('\n').filter(line => line.trim())
                        }
                      })}
                      data-testid="textarea-custom-instructions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Restricted Actions</Label>
                    <Textarea
                      placeholder="Actions this agent should never perform (one per line)"
                      value={agentConfig.fineTuningRules?.restrictedActions?.join('\n') || ''}
                      onChange={(e) => handleSave({ 
                        fineTuningRules: {
                          ...agentConfig.fineTuningRules,
                          restrictedActions: e.target.value.split('\n').filter(line => line.trim())
                        }
                      })}
                      data-testid="textarea-restricted-actions"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority Keywords</Label>
                    <Textarea
                      placeholder="Keywords that should trigger high priority (one per line)"
                      value={agentConfig.fineTuningRules?.priorityKeywords?.join('\n') || ''}
                      onChange={(e) => handleSave({ 
                        fineTuningRules: {
                          ...agentConfig.fineTuningRules,
                          priorityKeywords: e.target.value.split('\n').filter(line => line.trim())
                        }
                      })}
                      data-testid="textarea-priority-keywords"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Response Format</Label>
                    <Select 
                      value={agentConfig.fineTuningRules?.responseFormat || 'json'}
                      onValueChange={(value) => handleSave({ 
                        fineTuningRules: {
                          ...agentConfig.fineTuningRules,
                          responseFormat: value
                        }
                      })}
                    >
                      <SelectTrigger data-testid="select-response-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="text">Plain Text</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Changes are saved automatically. Agent will use new settings on next analysis cycle.
              </p>
              
              <div className="flex gap-2">
                {saving === selectedAgent && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Saving...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}