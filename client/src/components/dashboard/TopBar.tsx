import { RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SystemNotifications } from '@/components/notifications/SystemNotifications';

interface TopBarProps {
  isConnected: boolean;
}

export default function TopBar({ isConnected }: TopBarProps) {
  const queryClient = useQueryClient();

  const { data: lastUpdate } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  // Get actual monitoring status from agent control dashboard
  const { data: agentControlData } = useQuery({
    queryKey: ['/api/agent-control/dashboard'],
    refetchInterval: 30000,
  });

  // Determine if real-time monitoring is actually enabled
  const isMonitoringActive = agentControlData?.activeMonitoring > 0;
  
  const { toast } = useToast();

  // Get all agents for master control
  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  // Master monitoring toggle mutation
  const masterToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!agents) return;
      
      // Toggle monitoring for all agents
      const promises = agents.map((agent: any) => 
        apiRequest('POST', `/api/agents/${agent.id}/enable-monitoring`, { enabled })
      );
      
      await Promise.all(promises);
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-control/dashboard'] });
      toast({ 
        title: `All agents ${enabled ? 'enabled' : 'disabled'} successfully`,
        description: `Real-time monitoring ${enabled ? 'activated' : 'deactivated'} for all agents`
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to update monitoring", 
        variant: "destructive",
        description: "Could not update monitoring settings for all agents"
      });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  return (
    <header className="bg-dark-surface border-b border-dark-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white" data-testid="page-title">
            Operations Dashboard
          </h2>
          <p className="text-sm text-slate-400" data-testid="last-updated">
            Last updated: {formatTimestamp()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3" data-testid="monitoring-control">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isMonitoringActive ? 'bg-success' : 'bg-yellow-500'}`}></div>
              <span className="text-slate-300">
                {isMonitoringActive ? 'Real-time monitoring' : 'Monitoring disabled'}
              </span>
            </div>
            <Switch
              checked={isMonitoringActive}
              onCheckedChange={(enabled) => masterToggleMutation.mutate(enabled)}
              disabled={masterToggleMutation.isPending}
              data-testid="master-monitoring-toggle"
            />
          </div>
          
          <Button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            data-testid="button-refresh"
          >
            <RefreshCw className="mr-2" size={16} />
            Refresh
          </Button>
          
          <SystemNotifications />
          
          <div className="flex items-center space-x-3" data-testid="user-profile">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
              <User className="text-slate-300 text-sm" size={16} />
            </div>
            <span className="text-sm text-slate-300">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
