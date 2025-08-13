import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search, Lightbulb, Shield, Wrench, Brain } from 'lucide-react';

const agentIcons = {
  collector: Download,
  detector: Search,
  predictor: Brain,
  recommender: Lightbulb,
  approval: Shield,
  executor: Wrench,
  audit: Search,
};

const agentColors = {
  collector: "bg-primary/20 text-primary",
  detector: "bg-warning/20 text-warning",
  predictor: "bg-purple-500/20 text-purple-400",
  recommender: "bg-green-500/20 text-green-400",
  approval: "bg-blue-500/20 text-blue-400",
  executor: "bg-red-500/20 text-red-400",
  audit: "bg-indigo-500/20 text-indigo-400",
};

export default function AgentStatus() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="text-white">Agent Status</CardTitle>
          <p className="text-sm text-slate-400">Loading agent information...</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="h-16 bg-slate-700 rounded mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border" data-testid="agent-status-section">
      <CardHeader className="border-b border-dark-border">
        <CardTitle className="text-white">Agent Status</CardTitle>
        <p className="text-sm text-slate-400">Real-time monitoring of all AI agents</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents?.map((agent: any) => {
            const IconComponent = agentIcons[agent.type as keyof typeof agentIcons] || Search;
            const colorClass = agentColors[agent.type as keyof typeof agentColors] || "bg-slate-500/20 text-slate-400";
            
            return (
              <div 
                key={agent.id} 
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white" data-testid={`agent-name-${agent.id}`}>
                        {agent.name}
                      </h4>
                      <p className="text-xs text-slate-400" data-testid={`agent-id-${agent.id}`}>
                        {agent.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-success' : 'bg-error'}`}></div>
                    <span className={`text-xs ${agent.status === 'active' ? 'text-success' : 'text-error'}`} data-testid={`agent-status-${agent.id}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPU Usage:</span>
                    <span className="text-white" data-testid={`agent-cpu-${agent.id}`}>
                      {agent.cpuUsage || '0'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Memory:</span>
                    <span className="text-white" data-testid={`agent-memory-${agent.id}`}>
                      {agent.memoryUsage || 0}MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processed:</span>
                    <span className="text-white" data-testid={`agent-processed-${agent.id}`}>
                      {agent.processedCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Heartbeat:</span>
                    <span className="text-success" data-testid={`agent-heartbeat-${agent.id}`}>
                      {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
