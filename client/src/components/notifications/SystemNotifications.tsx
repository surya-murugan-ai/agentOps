import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CreditCard, 
  X, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Wifi,
  WifiOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiStatus {
  openai: {
    status: 'active' | 'quota_exceeded' | 'error';
    lastError?: string;
    errorCount?: number;
  };
}

export function SystemNotifications() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  const { data: apiStatus } = useQuery<ApiStatus>({
    queryKey: ['/api/system/api-status'],
    refetchInterval: 30000,
  });

  // Auto-expand when there are critical issues
  useEffect(() => {
    if (apiStatus?.openai?.status === 'quota_exceeded' || apiStatus?.openai?.status === 'error') {
      setIsExpanded(true);
    }
  }, [apiStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'quota_exceeded': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'quota_exceeded': return 'Quota Exceeded';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const hasIssues = apiStatus?.openai?.status !== 'active';
  const isQuotaExceeded = apiStatus?.openai?.status === 'quota_exceeded';
  const hasErrors = apiStatus?.openai?.status === 'error';

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  if (!apiStatus) return null;

  return (
    <div className="fixed top-4 right-4 z-30 w-80" data-testid="system-notifications">
      {/* Compact Status Indicator */}
      <Card className={cn(
        "border transition-all duration-200",
        hasIssues ? "border-yellow-500/50 bg-yellow-500/5" : "border-slate-700 bg-slate-800/50",
        isExpanded ? "shadow-lg" : "shadow-md"
      )}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {hasIssues ? <WifiOff size={16} className="text-yellow-500" /> : <Wifi size={16} className="text-green-500" />}
                <span className="text-sm font-medium">API Status</span>
              </div>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs px-2 py-1",
                  hasIssues ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full mr-1", getStatusColor(apiStatus.openai.status))} />
                {getStatusText(apiStatus.openai.status)}
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
              data-testid="button-toggle-notifications"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 space-y-3">
              {/* OpenAI Status Detail */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">OpenAI Service</span>
                  <div className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(apiStatus.openai.status))} />
                    <span className="text-xs">{getStatusText(apiStatus.openai.status)}</span>
                  </div>
                </div>

                {/* Quota Exceeded Alert */}
                {isQuotaExceeded && !dismissedNotifications.includes('quota-exceeded') && (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong>OpenAI API quota exceeded.</strong><br />
                          AI features may be limited. Please check your billing.
                          {apiStatus.openai.errorCount && (
                            <div className="mt-1 text-xs text-yellow-300">
                              Errors: {apiStatus.openai.errorCount}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification('quota-exceeded')}
                          className="h-5 w-5 p-0 ml-2"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* API Error Alert */}
                {hasErrors && !dismissedNotifications.includes('api-error') && (
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong>API Connection Error</strong><br />
                          {apiStatus.openai.lastError || 'Unable to connect to OpenAI services'}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissNotification('api-error')}
                          className="h-5 w-5 p-0 ml-2"
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quick Actions */}
                {hasIssues && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      onClick={() => window.open('https://platform.openai.com/usage', '_blank')}
                    >
                      <CreditCard size={12} className="mr-1" />
                      Check Billing
                      <ExternalLink size={12} className="ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}