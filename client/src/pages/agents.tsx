import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Activity, Cpu, MemoryStick } from 'lucide-react';

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
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
    <div className="p-6">
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

              <div className="text-xs text-slate-400">
                Last heartbeat: {agent.lastHeartbeat ? 
                  new Date(agent.lastHeartbeat).toLocaleTimeString() : 'N/A'
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}