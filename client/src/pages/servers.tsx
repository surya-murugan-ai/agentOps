import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';

export default function ServersPage() {
  const { data: servers, isLoading } = useQuery({
    queryKey: ['/api/servers'],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Server Management</h1>
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
      case 'healthy': return 'bg-success text-success-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'critical': return 'bg-error text-error-foreground';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Server Management</h1>
          <div className="text-sm text-slate-400">
            {servers?.length || 0} servers monitored
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers?.map((server: any) => (
          <Card key={server.id} className="bg-dark-surface border-dark-border hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Server size={20} />
                  <span>{server.hostname}</span>
                </CardTitle>
                <Badge className={getStatusColor(server.status)}>
                  {server.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Environment</p>
                  <p className="text-white capitalize">{server.environment}</p>
                </div>
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-white">{server.location}</p>
                </div>
              </div>
              
              <div>
                <p className="text-slate-400 text-sm">IP Address</p>
                <p className="text-white font-mono">{server.ipAddress}</p>
              </div>

              {server.tags && server.tags.length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {server.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-dark-border">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Last updated: {new Date(server.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}