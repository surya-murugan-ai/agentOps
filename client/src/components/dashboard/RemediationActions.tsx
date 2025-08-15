import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Fan, MemoryStick, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const actionIcons = {
  restart_service: RefreshCw,
  cleanup_files: Fan,
  optimize_memory: MemoryStick,
  optimize_cpu: Settings,
  clear_cache: Fan,
};

const statusStyles = {
  pending: { bg: "bg-warning/20 text-warning", label: "Manual Approval" },
  approved: { bg: "bg-success/20 text-success", label: "Auto-approved" },
  executing: { bg: "bg-primary/20 text-primary", label: "Executing" },
  completed: { bg: "bg-success/20 text-success", label: "Completed" },
  failed: { bg: "bg-error/20 text-error", label: "Failed" },
  rejected: { bg: "bg-slate/20 text-slate-400", label: "Rejected" },
};

interface RemediationAction {
  id: string;
  title: string;
  description: string;
  actionType: string;
  confidence: string;
  estimatedDowntime: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected';
  server?: { hostname: string };
  createdAt?: string;
}

export default function RemediationActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading } = useQuery<RemediationAction[]>({
    queryKey: ['/api/remediation-actions'],
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest('POST', `/api/remediation-actions/${actionId}/approve`, {
        userId: 'system-user', // In a real app, this would be the current user's ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
      toast({
        title: "Action Approved",
        description: "Remediation action has been approved and will be executed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve remediation action",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (actionId: string) => {
      return apiRequest('POST', `/api/remediation-actions/${actionId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
      toast({
        title: "Action Rejected",
        description: "Remediation action has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject remediation action",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (actionId: string) => {
    approveMutation.mutate(actionId);
  };

  const handleReject = (actionId: string) => {
    rejectMutation.mutate(actionId);
  };

  if (isLoading) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <CardTitle className="text-white">Pending Remediation Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-800/50 rounded-lg p-4">
                <div className="h-6 bg-slate-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-700 rounded mb-3"></div>
                <div className="h-3 bg-slate-700 rounded mb-2"></div>
                <div className="flex justify-between mt-4">
                  <div className="h-8 bg-slate-700 rounded w-20"></div>
                  <div className="h-8 bg-slate-700 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-surface border-dark-border" data-testid="remediation-actions">
      <CardHeader className="border-b border-dark-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Pending Remediation Actions</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Auto-approval threshold: High</span>
            <Button 
              variant="ghost" 
              className="text-sm text-primary hover:text-blue-400 transition-colors"
              data-testid="button-configure"
            >
              Configure
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-slate-400" data-testid="no-actions">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p>No pending remediation actions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action: RemediationAction) => {
              const IconComponent = actionIcons[action.actionType as keyof typeof actionIcons] || Settings;
              const statusStyle = statusStyles[action.status as keyof typeof statusStyles] || statusStyles.pending;
              
              return (
                <div 
                  key={action.id} 
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  data-testid={`action-${action.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center mt-0.5">
                        {action.status === 'executing' ? (
                          <Loader2 className="text-primary animate-spin" size={20} />
                        ) : (
                          <IconComponent className="text-warning" size={20} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-white mb-1" data-testid={`action-title-${action.id}`}>
                          {action.title}
                        </h4>
                        <p className="text-sm text-slate-400 mb-2" data-testid={`action-description-${action.id}`}>
                          {action.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span data-testid={`action-server-${action.id}`}>
                            Server: {action.server?.hostname || 'Unknown'}
                          </span>
                          <span data-testid={`action-confidence-${action.id}`}>
                            Confidence: {action.confidence}
                          </span>
                          <span data-testid={`action-downtime-${action.id}`}>
                            Est. Downtime: {action.estimatedDowntime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={statusStyle.bg} data-testid={`action-status-${action.id}`}>
                      {statusStyle.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Created: {action.createdAt ? new Date(action.createdAt).toLocaleString() : 'Unknown'}
                    </div>
                    
                    {action.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(action.id)}
                          disabled={rejectMutation.isPending}
                          className="bg-slate-700 text-slate-300 hover:bg-slate-600"
                          data-testid={`button-reject-${action.id}`}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(action.id)}
                          disabled={approveMutation.isPending}
                          className="bg-primary text-white hover:bg-blue-600"
                          data-testid={`button-approve-${action.id}`}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="animate-spin mr-2" size={16} />
                          ) : null}
                          Approve & Execute
                        </Button>
                      </div>
                    )}
                    
                    {action.status === 'executing' && (
                      <div className="flex items-center text-success text-sm">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Executing...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
