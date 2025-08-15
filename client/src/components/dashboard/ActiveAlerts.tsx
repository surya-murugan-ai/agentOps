import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const alertIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const alertStyles = {
  critical: {
    bg: "bg-red-500/10 border-red-500/20",
    icon: "text-error",
    badge: "bg-error/20 text-error"
  },
  warning: {
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: "text-warning",
    badge: "bg-warning/20 text-warning"
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: "text-primary",
    badge: "bg-primary/20 text-primary"
  },
};

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  server?: { hostname: string };
  createdAt: string;
}

export default function ActiveAlerts() {
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="text-white">Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-800/50 rounded-lg p-4">
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-700 rounded mb-3"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-700 rounded w-20"></div>
                  <div className="h-3 bg-slate-700 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border" data-testid="active-alerts">
      <CardHeader className="border-b border-dark-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Active Alerts</CardTitle>
          <Button 
            variant="ghost" 
            className="text-sm text-primary hover:text-blue-400 transition-colors"
            data-testid="button-view-all-alerts"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-400" data-testid="no-alerts">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert: Alert) => {
            const severity = alert.severity as keyof typeof alertIcons;
            const IconComponent = alertIcons[severity] || AlertCircle;
            const styles = alertStyles[severity] || alertStyles.info;
            
            return (
              <div 
                key={alert.id} 
                className={`rounded-lg p-4 border ${styles.bg}`}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`${styles.icon} text-sm`} size={16} />
                    <span className="text-sm font-medium text-white" data-testid={`alert-title-${alert.id}`}>
                      {alert.title}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${styles.badge}`} data-testid={`alert-severity-${alert.id}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3" data-testid={`alert-description-${alert.id}`}>
                  {alert.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500" data-testid={`alert-server-${alert.id}`}>
                    {alert.server?.hostname || 'Unknown Server'}
                  </span>
                  <span className="text-slate-500" data-testid={`alert-time-${alert.id}`}>
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Unknown'}
                  </span>
                </div>
              </div>
            );
          })
        )}
        
        {alerts.length > 0 && (
          <div className="pt-4 border-t border-dark-border">
            <Button 
              variant="ghost" 
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
              data-testid="button-view-all-active-alerts"
            >
              View all {alerts.length} active alerts →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
