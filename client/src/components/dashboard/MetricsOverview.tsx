import { useQuery } from '@tanstack/react-query';
import { Server, Bot, AlertTriangle, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MetricsOverview() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-slate-700 rounded-lg mb-4"></div>
                <div className="h-6 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-700 rounded mb-3"></div>
                <div className="h-3 bg-slate-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-dark-surface border-dark-border" data-testid="metric-servers">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Server className="text-primary text-xl" size={24} />
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">+2.1%</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" data-testid="total-servers">
            {metrics?.totalServers || 0}
          </h3>
          <p className="text-sm text-slate-400">Total Servers</p>
          <div className="mt-3 text-xs text-slate-500">
            <span className="text-success" data-testid="healthy-servers">
              {metrics?.healthyServers || 0} Healthy
            </span> • 
            <span className="text-warning ml-1" data-testid="warning-servers">
              {metrics?.warningServers || 0} Warning
            </span> • 
            <span className="text-error ml-1" data-testid="critical-servers">
              {metrics?.criticalServers || 0} Critical
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-surface border-dark-border" data-testid="metric-agents">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center">
              <Bot className="text-success text-xl" size={24} />
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">Online</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" data-testid="active-agents">
            {metrics?.activeAgents || 0}/{metrics?.totalAgents || 0}
          </h3>
          <p className="text-sm text-slate-400">Active Agents</p>
          <div className="mt-3 text-xs text-slate-500">
            <span>Avg uptime: 99.94%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-surface border-dark-border" data-testid="metric-alerts">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning text-xl" size={24} />
            </div>
            <span className="text-xs bg-error/20 text-error px-2 py-1 rounded-full">-15.2%</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" data-testid="active-alerts">
            {metrics?.activeAlerts || 0}
          </h3>
          <p className="text-sm text-slate-400">Active Alerts</p>
          <div className="mt-3 text-xs text-slate-500">
            <span className="text-error" data-testid="critical-alerts">
              {metrics?.criticalAlerts || 0} Critical
            </span> • 
            <span className="text-warning ml-1" data-testid="warning-alerts">
              {metrics?.warningAlerts || 0} Warning
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-dark-surface border-dark-border" data-testid="metric-remediations">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Wrench className="text-primary text-xl" size={24} />
            </div>
            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full">+8.4%</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1" data-testid="remediations-today">
            {metrics?.remediationsToday || 0}
          </h3>
          <p className="text-sm text-slate-400">Remediations Today</p>
          <div className="mt-3 text-xs text-slate-500">
            <span data-testid="auto-remediations">
              {metrics?.autoRemediations || 0} Automated
            </span> • 
            <span data-testid="manual-remediations">
              {metrics?.manualRemediations || 0} Manual
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
