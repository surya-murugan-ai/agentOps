import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Shield, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';

export default function AuditPage() {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['/api/audit-logs'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-background">
        <Sidebar />
        <div className="ml-64 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Audit Logs</h1>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
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
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-success" />;
      case 'failure': return <AlertCircle size={16} className="text-error" />;
      case 'warning': return <AlertCircle size={16} className="text-warning" />;
      default: return <Info size={16} className="text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success/20 text-success border-success/30';
      case 'failure': return 'bg-error/20 text-error border-error/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getCategoryIcon = (action: string) => {
    if (action.toLowerCase().includes('agent')) return <Shield size={20} className="text-primary" />;
    if (action.toLowerCase().includes('remediation')) return <AlertCircle size={20} className="text-warning" />;
    return <ClipboardList size={20} className="text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-slate-400 mt-1">Complete audit trail for compliance and monitoring</p>
          </div>
          <div className="text-sm text-slate-400">
            {auditLogs?.length || 0} total entries
          </div>
        </div>

        <div className="space-y-3">
          {auditLogs?.map((log: any) => (
            <Card key={log.id} className="bg-dark-surface border-dark-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getCategoryIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-white font-medium">{log.action}</h3>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(log.status)}
                          <Badge className={getStatusColor(log.status)} variant="outline">
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-2">{log.details}</p>
                      
                      {log.impact && (
                        <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
                          <p className="text-slate-400 text-xs mb-1">Impact:</p>
                          <p className="text-slate-200 text-sm">{log.impact}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
                        <span>ID: {log.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!auditLogs || auditLogs.length === 0) && (
          <div className="text-center py-12">
            <ClipboardList size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No audit logs found</h3>
            <p className="text-slate-400">Audit logs will appear here as system activities occur.</p>
          </div>
        )}
      </div>
    </div>
  );
}