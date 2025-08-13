import { RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TopBarProps {
  isConnected: boolean;
}

export default function TopBar({ isConnected }: TopBarProps) {
  const queryClient = useQueryClient();

  const { data: lastUpdate } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
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
          <div className="flex items-center space-x-2 text-sm" data-testid="connection-status">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}></div>
            <span className="text-slate-300">
              {isConnected ? 'Real-time monitoring' : 'Connecting...'}
            </span>
          </div>
          
          <Button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            data-testid="button-refresh"
          >
            <RefreshCw className="mr-2" size={16} />
            Refresh
          </Button>
          
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
