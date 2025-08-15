import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Play,
  Pause,
  Square,
  BarChart3
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  cpuUsage: string;
  memoryUsage: string;
  processedCount: number;
  errorCount: number;
  lastHeartbeat: string;
}

interface AgentControlSettings {
  id: string;
  agentId: string;
  realtimeMonitoringEnabled: boolean;
  monitoringFrequencySeconds: number;
  autoRestartEnabled: boolean;
  maxRetries: number;
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
  operatingSchedule: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string;
      startTime: string;
      endTime: string;
      enabled: boolean;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AgentControlPage() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  // Fetch all agent control settings to show monitoring status
  const { data: allControlSettings = [] } = useQuery<AgentControlSettings[]>({
    queryKey: ['/api/agent-control-settings'],
  });

  // Fetch agent control settings for selected agent
  const { data: controlSettings, isLoading: settingsLoading } = useQuery<AgentControlSettings>({
    queryKey: ['/api/agents', selectedAgent, 'control-settings'],
    enabled: !!selectedAgent,
  });

  // Fetch dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/agent-control/dashboard'],
  });

  // Mutations for agent control
  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ agentId, enabled }: { agentId: string; enabled: boolean }) => {
      const response = await apiRequest('POST', `/api/agents/${agentId}/enable-monitoring`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-control/dashboard'] });
      if (selectedAgent) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents', selectedAgent, 'control-settings'] });
      }
      toast({ title: "Monitoring setting updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update monitoring setting", variant: "destructive" });
    },
  });

  const setFrequencyMutation = useMutation({
    mutationFn: async ({ agentId, frequencySeconds }: { agentId: string; frequencySeconds: number }) => {
      const response = await apiRequest('POST', `/api/agents/${agentId}/monitoring-frequency`, { frequencySeconds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-control/dashboard'] });
      if (selectedAgent) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents', selectedAgent, 'control-settings'] });
      }
      toast({ title: "Monitoring frequency updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update monitoring frequency", variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ agentId, settings }: { agentId: string; settings: Partial<AgentControlSettings> }) => {
      return apiRequest(`/api/agents/${agentId}/control-settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-control/dashboard'] });
      if (selectedAgent) {
        queryClient.invalidateQueries({ queryKey: ['/api/agents', selectedAgent, 'control-settings'] });
      }
      toast({ title: "Agent settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update agent settings", variant: "destructive" });
    },
  });

  const agentActionMutation = useMutation({
    mutationFn: async ({ agentId, action }: { agentId: string; action: 'pause' | 'resume' | 'restart' }) => {
      const response = await apiRequest('POST', `/api/agents/${agentId}/${action}`);
      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-control/dashboard'] });
      toast({ title: `Agent ${action} action completed successfully` });
    },
    onError: (_, { action }) => {
      toast({ title: `Failed to ${action} agent`, variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paused: 'secondary',
      error: 'destructive',
      inactive: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0].id);
    }
  }, [agents, selectedAgent]);

  if (agentsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Agent Control Center</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="agent-control-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Agent Control Center</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'}
          data-testid="dashboard-nav-button"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Dashboard Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Agents</p>
                  <p className="text-2xl font-bold">{dashboardData.totalAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Monitoring</p>
                  <p className="text-2xl font-bold">{dashboardData.activeMonitoring}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Frequency</p>
                  <p className="text-2xl font-bold">{dashboardData.averageFrequency}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Error Agents</p>
                  <p className="text-2xl font-bold">{dashboardData.errorAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>AI Agents</span>
            </CardTitle>
            <CardDescription>
              Select an agent to configure monitoring settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => {
              const agentControlSettings = allControlSettings.find(settings => settings.agentId === agent.id);
              const isMonitoringEnabled = agentControlSettings?.realtimeMonitoringEnabled !== false;
              const monitoringStatus = isMonitoringEnabled ? 'active' : 'inactive';
              
              return (
                <div
                  key={agent.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAgent === agent.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                  data-testid={`agent-item-${agent.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(monitoringStatus)}
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                    {getStatusBadge(monitoringStatus)}
                  </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>CPU: {agent.cpuUsage}% | Memory: {agent.memoryUsage}MB</p>
                  <p>Processed: {agent.processedCount} | Errors: {agent.errorCount}</p>
                </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Agent Control Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Control Settings</span>
            </CardTitle>
            <CardDescription>
              Configure monitoring and control settings for the selected agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedAgent && controlSettings && !settingsLoading ? (
              <>
                {/* Real-time Monitoring Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Real-time Monitoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable continuous monitoring of agent health and performance
                    </p>
                  </div>
                  <Switch
                    checked={controlSettings.realtimeMonitoringEnabled}
                    onCheckedChange={(enabled) =>
                      toggleMonitoringMutation.mutate({ agentId: selectedAgent, enabled })
                    }
                    data-testid="monitoring-toggle"
                  />
                </div>

                <Separator />

                {/* Monitoring Frequency */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Monitoring Frequency</Label>
                  <p className="text-sm text-muted-foreground">
                    How often the agent performs health checks (in seconds)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="10"
                      max="3600"
                      value={controlSettings.monitoringFrequencySeconds}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 10) {
                          setFrequencyMutation.mutate({ 
                            agentId: selectedAgent, 
                            frequencySeconds: value 
                          });
                        }
                      }}
                      className="w-24"
                      data-testid="frequency-input"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                </div>

                <Separator />

                {/* Agent Control Actions */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Agent Control Actions</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => agentActionMutation.mutate({ agentId: selectedAgent, action: 'pause' })}
                      disabled={agentActionMutation.isPending}
                      data-testid="pause-agent-button"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => agentActionMutation.mutate({ agentId: selectedAgent, action: 'resume' })}
                      disabled={agentActionMutation.isPending}
                      data-testid="resume-agent-button"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => agentActionMutation.mutate({ agentId: selectedAgent, action: 'restart' })}
                      disabled={agentActionMutation.isPending}
                      data-testid="restart-agent-button"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restart
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Advanced Settings</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Auto Restart</Label>
                      <Switch
                        checked={controlSettings.autoRestartEnabled}
                        onCheckedChange={(enabled) =>
                          updateSettingsMutation.mutate({
                            agentId: selectedAgent,
                            settings: { autoRestartEnabled: enabled }
                          })
                        }
                        data-testid="auto-restart-toggle"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Max Retries</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={controlSettings.maxRetries}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            updateSettingsMutation.mutate({
                              agentId: selectedAgent,
                              settings: { maxRetries: value }
                            });
                          }
                        }}
                        className="w-20"
                        data-testid="max-retries-input"
                      />
                    </div>
                  </div>

                  {/* Alert Thresholds */}
                  <div className="space-y-3">
                    <Label className="text-sm">Alert Thresholds</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">CPU Usage (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={controlSettings.alertThresholds.cpuUsage}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              updateSettingsMutation.mutate({
                                agentId: selectedAgent,
                                settings: {
                                  alertThresholds: {
                                    ...controlSettings.alertThresholds,
                                    cpuUsage: value
                                  }
                                }
                              });
                            }
                          }}
                          className="w-20"
                          data-testid="cpu-threshold-input"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Memory Usage (MB)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={controlSettings.alertThresholds.memoryUsage}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              updateSettingsMutation.mutate({
                                agentId: selectedAgent,
                                settings: {
                                  alertThresholds: {
                                    ...controlSettings.alertThresholds,
                                    memoryUsage: value
                                  }
                                }
                              });
                            }
                          }}
                          className="w-24"
                          data-testid="memory-threshold-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Configuration Status</h4>
                  <div className="text-sm space-y-1">
                    <p>Last Updated: {new Date(controlSettings.updatedAt).toLocaleString()}</p>
                    <p>Monitoring: {controlSettings.realtimeMonitoringEnabled ? 'Active' : 'Inactive'}</p>
                    <p>Frequency: Every {controlSettings.monitoringFrequencySeconds} seconds</p>
                  </div>
                </div>
              </>
            ) : settingsLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                Select an agent to view and configure its settings
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}