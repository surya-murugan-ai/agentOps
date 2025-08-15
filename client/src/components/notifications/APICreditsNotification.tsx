import { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface APICreditsNotificationProps {
  onDismiss?: () => void;
}

interface APIStatus {
  openai: {
    status: 'active' | 'quota_exceeded' | 'invalid_key' | 'rate_limited';
    lastError?: string;
    errorCount: number;
  };
  anthropic: {
    status: 'active' | 'quota_exceeded' | 'invalid_key' | 'rate_limited';
    lastError?: string;
    errorCount: number;
  };
}

export function APICreditsNotification({ onDismiss }: APICreditsNotificationProps) {
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  // Check API status periodically
  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const response = await fetch('/api/system/api-status');
        if (response.ok) {
          const status = await response.json();
          setApiStatus(status);
          
          // Show notification if any API has issues
          const hasIssues = 
            status.openai.status !== 'active' || 
            status.anthropic.status !== 'active';
          
          if (hasIssues && !isVisible) {
            setIsVisible(true);
            
            // Show toast notification for immediate awareness
            toast({
              title: "API Credits Issue Detected",
              description: "Some AI services are experiencing credit or quota issues. Check the notification panel for details.",
              variant: "destructive",
            });
          } else if (!hasIssues && isVisible) {
            setIsVisible(false);
          }
        }
      } catch (error) {
        console.error('Failed to check API status:', error);
      }
    };

    // Check immediately and then every 30 seconds
    checkAPIStatus();
    const interval = setInterval(checkAPIStatus, 30000);
    
    return () => clearInterval(interval);
  }, [isVisible, toast]);

  const getStatusMessage = (provider: string, status: APIStatus['openai']) => {
    switch (status.status) {
      case 'quota_exceeded':
        return `${provider} API quota exceeded. Please add credits to your account.`;
      case 'invalid_key':
        return `${provider} API key is invalid or expired. Please update your API key.`;
      case 'rate_limited':
        return `${provider} API rate limit exceeded. Please wait or upgrade your plan.`;
      default:
        return `${provider} API experiencing issues.`;
    }
  };

  const getProviderURL = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'https://platform.openai.com/account/billing';
      case 'anthropic':
        return 'https://console.anthropic.com/account/billing';
      default:
        return '#';
    }
  };

  if (!isVisible || !apiStatus) {
    return null;
  }

  const hasOpenAIIssues = apiStatus.openai.status !== 'active';
  const hasAnthropicIssues = apiStatus.anthropic.status !== 'active';

  return (
    <div className="fixed top-4 right-4 z-50 w-96" data-testid="api-credits-notification">
      <Alert variant="destructive" className="shadow-lg border-red-500">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          API Credits Issue
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="text-sm">
            Your AI agents are experiencing API credit or quota issues. Some features may be limited.
          </p>
          
          <div className="space-y-2">
            {hasOpenAIIssues && (
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  OpenAI: {getStatusMessage('OpenAI', apiStatus.openai)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Errors: {apiStatus.openai.errorCount}
                </p>
              </div>
            )}
            
            {hasAnthropicIssues && (
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Anthropic: {getStatusMessage('Anthropic', apiStatus.anthropic)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Errors: {apiStatus.anthropic.errorCount}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            {hasOpenAIIssues && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(getProviderURL('openai'), '_blank')}
                className="text-xs"
                data-testid="button-openai-billing"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                OpenAI Billing
              </Button>
            )}
            
            {hasAnthropicIssues && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.open(getProviderURL('anthropic'), '_blank')}
                className="text-xs"
                data-testid="button-anthropic-billing"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Anthropic Billing
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                setIsVisible(false);
                onDismiss?.();
              }}
              className="text-xs ml-auto"
              data-testid="button-dismiss"
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}