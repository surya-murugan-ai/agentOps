import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, Clock, XCircle, User, FileText, Shield, Settings, ArrowUp, ArrowDown, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  stepType: string;
  requiredRole: string;
  status: string;
  assignedTo?: string;
  approvedBy?: string;
  comments?: string;
  createdAt: string;
  completedAt?: string;
  metadata: {
    timeoutHours: number;
    autoEscalate: boolean;
    parallelApproval: boolean;
    conditions: Record<string, any>;
  };
}

interface ApprovalWorkflow {
  id: string;
  workflowName: string;
  riskScore: number;
  requiredApprovals: number;
  currentStep: number;
  totalSteps: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    serverCriticality: string;
    environment: string;
    impactAssessment: string;
    businessJustification: string;
    escalationReason?: string;
  };
  remediationAction: {
    id: string;
    title: string;
    description: string;
    actionType: string;
    hostname: string;
    confidence: string;
    estimatedDowntime: string;
    status: string;
  };
  steps: WorkflowStep[];
  currentStep?: WorkflowStep;
}

const stepTypeLabels = {
  basic_approval: "Basic Approval",
  compliance_check: "Compliance Check", 
  impact_assessment: "Impact Assessment",
  security_review: "Security Review",
  change_board: "Change Board"
};

const roleLabels = {
  operator: "Operator",
  supervisor: "Supervisor",
  manager: "Manager",
  director: "Director",
  compliance_officer: "Compliance Officer"
};

function WorkflowPage() {
  const [selectedRole, setSelectedRole] = useState("supervisor");
  const [approvalAction, setApprovalAction] = useState<"approved" | "rejected" | "escalated">("approved");
  const [approvalComments, setApprovalComments] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending workflows
  const { data: pendingWorkflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ["/api/workflows/pending", selectedRole],
    queryFn: () => apiRequest(`/api/workflows/pending?role=${selectedRole}`)
  });

  // Fetch workflow statistics
  const { data: workflowStats } = useQuery({
    queryKey: ["/api/workflows/stats/summary"],
    queryFn: () => apiRequest("/api/workflows/stats/summary")
  });

  // Process step approval mutation
  const approveStepMutation = useMutation({
    mutationFn: async ({ workflowId, stepId, action, comments }: {
      workflowId: string;
      stepId: string;
      action: string;
      comments: string;
    }) => {
      return apiRequest(`/api/workflows/${workflowId}/steps/${stepId}/approve`, {
        method: "POST",
        body: {
          action,
          approverUserId: "current-user", // In real app, get from auth context
          comments
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats/summary"] });
      toast({
        title: "Success",
        description: `Step ${approvalAction} successfully`
      });
      setSelectedWorkflowId(null);
      setSelectedStepId(null);
      setApprovalComments("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${approvalAction} step: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Bulk approval mutation
  const bulkApprovalMutation = useMutation({
    mutationFn: async ({ workflowIds, action, comments }: {
      workflowIds: string[];
      action: string;
      comments: string;
    }) => {
      return apiRequest("/api/workflows/bulk-action", {
        method: "POST",
        body: {
          workflowIds,
          action,
          approverUserId: "current-user",
          comments
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats/summary"] });
      toast({
        title: "Bulk Action Complete",
        description: "Selected workflows have been processed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Bulk action failed: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const getRiskBadgeColor = (score: number) => {
    if (score >= 80) return "destructive";
    if (score >= 50) return "default";
    return "secondary";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "default";
      case "approved": return "default";
      case "rejected": return "destructive";
      case "escalated": return "default";
      default: return "secondary";
    }
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case "basic_approval": return <User className="h-4 w-4" />;
      case "compliance_check": return <Shield className="h-4 w-4" />;
      case "impact_assessment": return <AlertTriangle className="h-4 w-4" />;
      case "security_review": return <Shield className="h-4 w-4" />;
      case "change_board": return <Users className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="workflows-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Approval Workflows</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage complex multi-step approval processes for remediation actions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRole} onValueChange={setSelectedRole} data-testid="role-selector">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="director">Director</SelectItem>
              <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Workflow Statistics */}
      {workflowStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="workflow-stats">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                  <p className="text-2xl font-bold" data-testid="total-pending">{workflowStats.total}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="high-risk">{workflowStats.byRiskLevel.high}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Production</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="production-count">{workflowStats.byEnvironment.production}</p>
                </div>
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical Servers</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="critical-servers">{workflowStats.byServerCriticality.critical}</p>
                </div>
                <Settings className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Workflow History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Workflows Requiring Your Approval
              </CardTitle>
              <CardDescription>
                Workflows that require approval at your permission level: {roleLabels[selectedRole as keyof typeof roleLabels]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWorkflows ? (
                <div className="flex items-center justify-center py-8" data-testid="loading-workflows">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pendingWorkflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-workflows">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No workflows pending your approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table data-testid="workflows-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Remediation Action</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Current Step</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWorkflows.map((workflow: ApprovalWorkflow) => (
                        <TableRow key={workflow.id} data-testid={`workflow-row-${workflow.id}`}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium" data-testid={`workflow-name-${workflow.id}`}>{workflow.workflowName}</p>
                              <Badge variant={getStatusBadgeColor(workflow.status)} data-testid={`workflow-status-${workflow.id}`}>
                                {workflow.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium" data-testid={`action-title-${workflow.id}`}>{workflow.remediationAction.title}</p>
                              <p className="text-sm text-muted-foreground" data-testid={`action-hostname-${workflow.id}`}>
                                {workflow.remediationAction.hostname}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`action-description-${workflow.id}`}>
                                {workflow.remediationAction.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRiskBadgeColor(workflow.riskScore)} data-testid={`risk-score-${workflow.id}`}>
                              {workflow.riskScore}/100
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Progress 
                                value={(workflow.currentStep / workflow.totalSteps) * 100} 
                                className="w-24"
                                data-testid={`progress-${workflow.id}`}
                              />
                              <p className="text-xs text-muted-foreground" data-testid={`progress-text-${workflow.id}`}>
                                {workflow.currentStep}/{workflow.totalSteps}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {workflow.currentStep && (
                              <div className="flex items-center gap-2" data-testid={`current-step-${workflow.id}`}>
                                {getStepIcon(workflow.currentStep.stepType)}
                                <span className="text-sm">
                                  {stepTypeLabels[workflow.currentStep.stepType as keyof typeof stepTypeLabels]}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`environment-${workflow.id}`}>
                              {workflow.metadata.environment}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`created-time-${workflow.id}`}>
                            {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedWorkflowId(workflow.id);
                                    setSelectedStepId(workflow.currentStep?.id || null);
                                  }}
                                  data-testid={`approve-button-${workflow.id}`}
                                >
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Approve Workflow Step</DialogTitle>
                                  <DialogDescription>
                                    Review the details and provide your approval decision
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Workflow Details</h4>
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Name:</strong> {workflow.workflowName}</p>
                                        <p><strong>Risk Score:</strong> {workflow.riskScore}/100</p>
                                        <p><strong>Environment:</strong> {workflow.metadata.environment}</p>
                                        <p><strong>Server Criticality:</strong> {workflow.metadata.serverCriticality}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Remediation Action</h4>
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Title:</strong> {workflow.remediationAction.title}</p>
                                        <p><strong>Type:</strong> {workflow.remediationAction.actionType}</p>
                                        <p><strong>Hostname:</strong> {workflow.remediationAction.hostname}</p>
                                        <p><strong>Downtime:</strong> {workflow.remediationAction.estimatedDowntime}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-2">Impact Assessment</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {workflow.metadata.impactAssessment}
                                    </p>
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-2">Business Justification</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {workflow.metadata.businessJustification}
                                    </p>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <label htmlFor="action" className="block text-sm font-medium mb-2">
                                        Decision
                                      </label>
                                      <Select value={approvalAction} onValueChange={(value: any) => setApprovalAction(value)}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="approved">Approve</SelectItem>
                                          <SelectItem value="rejected">Reject</SelectItem>
                                          <SelectItem value="escalated">Escalate</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <label htmlFor="comments" className="block text-sm font-medium mb-2">
                                        Comments
                                      </label>
                                      <Textarea
                                        id="comments"
                                        value={approvalComments}
                                        onChange={(e) => setApprovalComments(e.target.value)}
                                        placeholder="Add your comments or reasoning..."
                                        rows={3}
                                      />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setSelectedWorkflowId(null)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          if (selectedWorkflowId && selectedStepId) {
                                            approveStepMutation.mutate({
                                              workflowId: selectedWorkflowId,
                                              stepId: selectedStepId,
                                              action: approvalAction,
                                              comments: approvalComments
                                            });
                                          }
                                        }}
                                        disabled={approveStepMutation.isPending}
                                      >
                                        {approveStepMutation.isPending ? "Processing..." : "Submit Decision"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow History</CardTitle>
              <CardDescription>
                View completed and historical workflow approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>Workflow history will be displayed here</p>
                <p className="text-sm">This feature is coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkflowPage;