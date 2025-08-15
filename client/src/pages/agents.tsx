import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Activity, Cpu, MemoryStick, Eye, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  const { data: agents, isLoading } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  const { data: agentDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['/api/agents', selectedAgent, 'details'],
    enabled: !!selectedAgent,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">AI Agent Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-dark-surface border-dark-border">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-slate-700 rounded mb-4"></div>
                  <div className="h-4 bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'inactive': return 'bg-slate-600 text-slate-200';
      case 'error': return 'bg-error text-error-foreground';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'collector': return <Activity size={20} />;
      case 'detector': return <Bot size={20} />;
      case 'predictor': return <Cpu size={20} />;
      default: return <Bot size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">AI Agent Management</h1>
          <div className="text-sm text-slate-400">
            {agents?.filter((a: any) => a.status === 'active').length || 0} active agents
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents?.map((agent: any) => (
          <Card key={agent.id} className="bg-dark-surface border-dark-border hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center space-x-2">
                  {getAgentIcon(agent.type)}
                  <span>{agent.name}</span>
                </CardTitle>
                <Badge className={getStatusColor(agent.status)}>
                  {agent.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Type</p>
                  <p className="text-white capitalize">{agent.type}</p>
                </div>
                <div>
                  <p className="text-slate-400">Uptime</p>
                  <p className="text-white">
                    {agent.startedAt ? 
                      Math.floor((Date.now() - new Date(agent.startedAt).getTime()) / 60000) + 'm' 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm flex items-center space-x-1">
                    <Cpu size={14} />
                    <span>CPU</span>
                  </span>
                  <span className="text-white text-sm">{agent.cpuUsage}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm flex items-center space-x-1">
                    <MemoryStick size={14} />
                    <span>Memory</span>
                  </span>
                  <span className="text-white text-sm">{agent.memoryUsage}MB</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-dark-border">
                <div>
                  <p className="text-slate-400">Processed</p>
                  <p className="text-white">{agent.processedCount || 0}</p>
                </div>
                <div>
                  <p className="text-slate-400">Errors</p>
                  <p className="text-white">{agent.errorCount || 0}</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 mb-3">
                Last heartbeat: {agent.lastHeartbeat ? 
                  new Date(agent.lastHeartbeat).toLocaleTimeString() : 'N/A'
                }
              </div>

              <Button 
                onClick={() => setSelectedAgent(agent.id)}
                className="w-full" 
                variant="outline"
                size="sm"
                data-testid={`button-view-agent-${agent.id}`}
              >
                <Eye size={16} className="mr-2" />
                View Details & Logs
              </Button>
            </CardContent>
          </Card>
        ))}
        </div>

        {/* Agent Details Modal */}
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] bg-dark-surface border-dark-border">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center space-x-2">
                {selectedAgent && agents?.find(a => a.id === selectedAgent)?.name && (
                  <>
                    {getAgentIcon(agents?.find(a => a.id === selectedAgent)?.type)}
                    <span>{agents?.find(a => a.id === selectedAgent)?.name}</span>
                    <Badge className={getStatusColor(agents?.find(a => a.id === selectedAgent)?.status)}>
                      {agents?.find(a => a.id === selectedAgent)?.status}
                    </Badge>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {detailsLoading ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="mx-auto h-8 w-8 animate-spin mb-2" />
                Loading agent details...
              </div>
            ) : agentDetails ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="activities" data-testid="tab-activities">Recent Activities</TabsTrigger>
                  <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
                  <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-dark-background border-dark-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center">
                          <Cpu className="mr-2 h-4 w-4" />
                          System Resources
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">CPU Usage</span>
                          <span className="text-white">{agentDetails.agent?.cpuUsage || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Memory</span>
                          <span className="text-white">{agentDetails.agent?.memoryUsage || 'N/A'}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Uptime</span>
                          <span className="text-white">{agentDetails.agent?.uptime || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-dark-background border-dark-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Processing Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Processed</span>
                          <span className="text-white">{agentDetails.agent?.processedCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Errors</span>
                          <span className="text-white">{agentDetails.agent?.errorCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Success Rate</span>
                          <span className="text-green-400">{agentDetails.performance?.successRate || 100}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="activities" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-medium mb-2 flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Recent Alerts ({agentDetails.recentActivities?.alerts?.length || 0})
                      </h3>
                      <ScrollArea className="h-32" data-testid="scroll-alerts">
                        {agentDetails.recentActivities?.alerts?.length > 0 ? (
                          <div className="space-y-2">
                            {agentDetails.recentActivities.alerts.map((alert: any) => (
                              <div key={alert.id} className="text-sm p-2 bg-dark-background rounded border border-dark-border">
                                <div className="flex justify-between items-start">
                                  <span className="text-white">{alert.title}</span>
                                  <Badge className={`ml-2 ${alert.severity === 'critical' ? 'bg-red-600' : alert.severity === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">{alert.description}</p>
                                <p className="text-slate-500 text-xs mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No recent alerts from this agent.</p>
                        )}
                      </ScrollArea>
                    </div>

                    <div>
                      <h3 className="text-white font-medium mb-2 flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        Recent Audit Logs ({agentDetails.recentActivities?.auditLogs?.length || 0})
                      </h3>
                      <ScrollArea className="h-40" data-testid="scroll-logs">
                        {agentDetails.recentActivities?.auditLogs?.length > 0 ? (
                          <div className="space-y-2">
                            {agentDetails.recentActivities.auditLogs.map((log: any) => (
                              <div key={log.id} className="text-sm p-2 bg-dark-background rounded border border-dark-border">
                                <div className="flex justify-between items-start">
                                  <span className="text-white">{log.action}</span>
                                  <Badge className={log.status === 'success' ? 'bg-green-600' : log.status === 'error' ? 'bg-red-600' : 'bg-gray-600'}>
                                    {log.status}
                                  </Badge>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">{log.details}</p>
                                <p className="text-slate-500 text-xs mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No recent audit logs from this agent.</p>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  <div>
                    <h3 className="text-white font-medium mb-3 flex items-center">
                      <Bot className="mr-2 h-4 w-4" />
                      AI-Generated Insights
                    </h3>
                    <ScrollArea className="h-64" data-testid="scroll-insights">
                      {agentDetails.insights?.length > 0 ? (
                        <div className="space-y-3">
                          {agentDetails.insights.map((insight: any, index: number) => (
                            <div key={index} className="p-3 bg-dark-background rounded border border-dark-border">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-blue-400 font-medium text-sm">{insight.action}</span>
                                <span className="text-slate-500 text-xs">{new Date(insight.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-300 text-sm">{insight.insight}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">No AI insights available for this agent yet.</p>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-dark-background border-dark-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Success Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-400">
                          {agentDetails.performance?.successRate || 100}%
                        </div>
                        <p className="text-slate-400 text-sm">Last 50 operations</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-dark-background border-dark-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Avg Response Time
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-400">
                          {agentDetails.performance?.avgProcessingTime || 'N/A'}
                        </div>
                        <p className="text-slate-400 text-sm">Processing time</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-dark-background border-dark-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm flex items-center">
                          <Activity className="mr-2 h-4 w-4" />
                          Last Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-white mb-1">
                          {agentDetails.performance?.lastActiveProcessing?.action || 'N/A'}
                        </div>
                        <p className="text-slate-400 text-xs">
                          {agentDetails.performance?.lastActiveProcessing?.timestamp ? 
                            new Date(agentDetails.performance.lastActiveProcessing.timestamp).toLocaleString() : 'N/A'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                Failed to load agent details
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}