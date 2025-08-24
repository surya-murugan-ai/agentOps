import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, CheckCircle, XCircle, AlertTriangle, Terminal, Play, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';

export default function RemediationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: remediations, isLoading, refetch } = useQuery({
    queryKey: ['/api/remediation-actions'],
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
    refetch();
  };

  const approveMutation = useMutation({
    mutationFn: async (remediationId: string) => {
      const response = await fetch(`/api/remediation-actions/${remediationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'system-auto-approval' })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
      toast({ title: "Remediation action approved successfully" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (remediationId: string) => {
      const response = await fetch(`/api/remediation-actions/${remediationId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
      toast({ title: "Remediation action executed successfully" });
    },
  });

  const executeCommandMutation = useMutation({
    mutationFn: async ({ remediation }: { remediation: any }) => {
      const response = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: remediation.serverId,
          actionType: remediation.actionType || 'investigate',
          command: remediation.command || `# Execute ${remediation.actionType} action\necho "Executing: ${remediation.description}"`,
          parameters: {},
          safetyChecks: [],
          maxExecutionTime: 300,
          requiresElevation: false
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions'] });
      toast({ 
        title: "Command executed successfully", 
        description: `Exit code: ${data.exitCode || 0}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Command execution failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-background">
        <Sidebar />
        <div className="ml-64 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Remediation Actions</h1>
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
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={20} className="text-warning" />;
      case 'approved': return <CheckCircle size={20} className="text-success" />;
      case 'executed': return <CheckCircle size={20} className="text-success" />;
      case 'failed': return <XCircle size={20} className="text-error" />;
      default: return <AlertTriangle size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/20 text-warning border-warning/30';
      case 'approved': return 'bg-primary/20 text-primary border-primary/30';
      case 'executed': return 'bg-success/20 text-success border-success/30';
      case 'failed': return 'bg-error/20 text-error border-error/30';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 70) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Remediation Actions</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              {Array.isArray(remediations) ? remediations.filter((r: any) => r.status === 'pending').length : 0} pending actions
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {Array.isArray(remediations) && remediations.map((remediation: any) => (
            <Card key={remediation.id} className={`bg-dark-surface border-dark-border ${getStatusColor(remediation.status)} border-l-4`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings size={20} className="text-primary" />
                    <div>
                      <CardTitle className="text-white">{remediation.title}</CardTitle>
                      <p className="text-sm text-slate-400">
                        Server: {remediation.server?.hostname} • Action: {remediation.actionType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(remediation.status)}
                    <Badge className={getStatusColor(remediation.status)}>
                      {remediation.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300">{remediation.description}</p>
                
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Confidence</p>
                      <p className={`font-semibold ${getConfidenceColor(remediation.confidence)}`}>
                        {remediation.confidence}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Downtime</p>
                      <p className="text-white">{remediation.estimatedDowntime}s</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Approval Required</p>
                      <p className="text-white">{remediation.requiresApproval ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {remediation.command && (
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-400 text-sm mb-1">Command:</p>
                    <code className="text-primary font-mono text-sm">{remediation.command}</code>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                  <div className="text-xs text-slate-400">
                    Created: {new Date(remediation.createdAt).toLocaleString()}
                    {remediation.approvedAt && (
                      <span> • Approved: {new Date(remediation.approvedAt).toLocaleString()}</span>
                    )}
                    {remediation.executedAt && (
                      <span> • Executed: {new Date(remediation.executedAt).toLocaleString()}</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Execute Command Button - Always Available */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => executeCommandMutation.mutate({ remediation })}
                      disabled={executeCommandMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid={`button-execute-command-${remediation.id}`}
                    >
                      <Terminal size={16} className="mr-1" />
                      Execute Command
                    </Button>
                    
                    {/* Approval workflow buttons */}
                    {remediation.status === 'pending' && remediation.requiresApproval && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(remediation.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${remediation.id}`}
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </Button>
                    )}
                    {remediation.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeMutation.mutate(remediation.id)}
                        disabled={executeMutation.isPending}
                        data-testid={`button-execute-${remediation.id}`}
                      >
                        <Play size={16} className="mr-1" />
                        Execute Via Workflow
                      </Button>
                    )}
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