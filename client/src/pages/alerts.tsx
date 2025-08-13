import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';

export default function AlertsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'system-auto-approval' })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: "Alert acknowledged successfully" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: "Alert resolved successfully" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Alert Management</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={20} className="text-error" />;
      case 'warning': return <AlertTriangle size={20} className="text-warning" />;
      case 'info': return <Info size={20} className="text-primary" />;
      default: return <Info size={20} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-error/20 text-error border-error/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'info': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-error text-error-foreground';
      case 'acknowledged': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Alert Management</h1>
          <div className="text-sm text-slate-400">
            {alerts?.filter((a: any) => a.status === 'active').length || 0} active alerts
          </div>
        </div>

      <div className="space-y-4">
        {alerts?.map((alert: any) => (
          <Card key={alert.id} className={`bg-dark-surface border-dark-border ${getSeverityColor(alert.severity)} border-l-4`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <CardTitle className="text-white">{alert.title}</CardTitle>
                    <p className="text-sm text-slate-400">
                      Server: {alert.server?.hostname} • {alert.metricType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <Badge className={getStatusColor(alert.status)}>
                    {alert.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">{alert.description}</p>
              
              {alert.metricValue && alert.threshold && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Current Value</p>
                      <p className="text-white font-mono">{alert.metricValue}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Threshold</p>
                      <p className="text-white font-mono">{alert.threshold}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                <div className="text-xs text-slate-400">
                  Created: {new Date(alert.createdAt).toLocaleString()}
                  {alert.acknowledgedAt && (
                    <span> • Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                  )}
                </div>
                
                {alert.status === 'active' && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle size={16} className="mr-1" />
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}