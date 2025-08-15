import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bell, 
  AlertTriangle, 
  CreditCard, 
  X, 
  ExternalLink,
  CheckCircle
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
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const { data: apiStatus } = useQuery<ApiStatus>({
    queryKey: ['/api/system/api-status'],
    refetchInterval: 30000,
  });

  // Mark new notifications when issues occur
  useEffect(() => {
    if (apiStatus?.openai?.status === 'quota_exceeded' || apiStatus?.openai?.status === 'error') {
      setHasNewNotifications(true);
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

  const handlePopoverOpen = () => {
    setIsOpen(true);
    setHasNewNotifications(false);
  };

  if (!apiStatus) return null;

  const notificationCount = [
    isQuotaExceeded && !dismissedNotifications.includes('quota-exceeded'),
    hasErrors && !dismissedNotifications.includes('api-error')
  ].filter(Boolean).length;

  return (
    <div className="fixed top-4 right-20 z-30" data-testid="system-notifications">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative h-10 w-10 p-0 rounded-full border-2 transition-all",
              hasIssues ? "border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" : "border-slate-600 bg-slate-800 hover:bg-slate-700"
            )}
            onClick={handlePopoverOpen}
            data-testid="button-notifications"
          >
            <Bell size={18} className={hasIssues ? "text-yellow-500" : "text-slate-400"} />
            
            {/* Notification Badge */}
            {(notificationCount > 0 || hasNewNotifications) && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {notificationCount > 0 ? notificationCount : '!'}
                </span>
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell size={16} />
                System Notifications
                {!hasIssues && (
                  <Badge variant="secondary" className="ml-auto">
                    <CheckCircle size={12} className="mr-1" />
                    All Good
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* API Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", getStatusColor(apiStatus.openai.status))} />
                  <span className="text-sm font-medium">OpenAI API</span>
                </div>
                <span className="text-xs text-slate-500">{getStatusText(apiStatus.openai.status)}</span>
              </div>

              {/* Active Notifications */}
              {notificationCount === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <CheckCircle size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Quota Exceeded Alert */}
                  {isQuotaExceeded && !dismissedNotifications.includes('quota-exceeded') && (
                    <Alert className="border-yellow-500/50 bg-yellow-500/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <strong>OpenAI API quota exceeded</strong><br />
                            <span className="text-xs">AI features may be limited. Please check your billing.</span>
                            {apiStatus.openai.errorCount && (
                              <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                                Errors: {apiStatus.openai.errorCount}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotification('quota-exceeded')}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* API Error Alert */}
                  {hasErrors && !dismissedNotifications.includes('api-error') && (
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <strong>API Connection Error</strong><br />
                            <span className="text-xs">{apiStatus.openai.lastError || 'Unable to connect to OpenAI services'}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotification('api-error')}
                            className="h-6 w-6 p-0 ml-2"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {hasIssues && (
                <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1"
                    onClick={() => window.open('https://platform.openai.com/usage', '_blank')}
                  >
                    <CreditCard size={12} className="mr-1" />
                    Check Billing
                    <ExternalLink size={12} className="ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}