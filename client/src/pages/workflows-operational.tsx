import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Clock, XCircle, Settings, BarChart3, FileText, Users, Filter, History, GitBranch, ArrowLeft, Home, Plus, Edit, Trash2, Eye, Download, Upload, Search, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Data fetching
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['/api/workflows'],
    refetchInterval: 30000,
  });

  const { data: remediationActions } = useQuery({
    queryKey: ['/api/remediation-actions'],
    refetchInterval: 30000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['/api/audit-logs'],
    refetchInterval: 30000,
  });

  // Mutations for workflow actions
  const approveWorkflow = useMutation({
    mutationFn: (workflowId: string) => apiRequest('POST', `/api/workflows/${workflowId}/approve`, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ title: "Workflow approved successfully" });
    }
  });

  const rejectWorkflow = useMutation({
    mutationFn: (workflowId: string) => apiRequest('POST', `/api/workflows/${workflowId}/reject`, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({ title: "Workflow rejected successfully" });
    }
  });

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pending', label: 'Pending Approvals', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'in_progress':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getNavItemClass = (itemId: string) => {
    return activeSection === itemId 
      ? "flex items-center space-x-3 px-4 py-3 rounded-lg bg-primary/20 text-primary border border-primary/30 cursor-pointer"
      : "flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors cursor-pointer";
  };

  const filteredWorkflows = Array.isArray(workflows) ? workflows : [];
  const pendingWorkflows = filteredWorkflows.filter((w: any) => w.status === 'pending');
  const approvedWorkflows = filteredWorkflows.filter((w: any) => w.status === 'approved');
  const rejectedWorkflows = filteredWorkflows.filter((w: any) => w.status === 'rejected');

  // Overview Section
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflow Overview</h1>
          <p className="text-slate-400 mt-2">
            Comprehensive view of all workflow activities and statistics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/')}
            data-testid="button-dashboard-main"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">
              Completed workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredWorkflows.filter((w: any) => w.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">
              Denied workflows
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Workflow Activity</CardTitle>
          <CardDescription>Latest workflow submissions and approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No workflows found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Workflows will appear here when remediation actions require approval
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.slice(0, 5).map((workflow: any) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.id}</TableCell>
                    <TableCell>{workflow.type || 'Remediation'}</TableCell>
                    <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                    <TableCell>{new Date(workflow.createdAt || Date.now()).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {workflow.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveWorkflow.mutate(workflow.id)}
                              disabled={approveWorkflow.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectWorkflow.mutate(workflow.id)}
                              disabled={rejectWorkflow.isPending}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Pending Approvals Section
  const renderPendingApprovals = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
          <p className="text-slate-400 mt-2">Review and approve pending workflow requests</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {pendingWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No pending approvals</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                All workflows have been processed
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWorkflows.map((workflow: any) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.id}</TableCell>
                    <TableCell>{workflow.type || 'Remediation'}</TableCell>
                    <TableCell>
                      <Badge variant={workflow.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                        {workflow.riskLevel || 'Medium'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(workflow.createdAt || Date.now()).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => approveWorkflow.mutate(workflow.id)}
                          disabled={approveWorkflow.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => rejectWorkflow.mutate(workflow.id)}
                          disabled={rejectWorkflow.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Templates Section
  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflow Templates</h1>
          <p className="text-slate-400 mt-2">Manage and configure workflow templates</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Server Restart', type: 'restart_service', riskLevel: 'Medium' },
          { name: 'Memory Optimization', type: 'optimize_memory', riskLevel: 'Low' },
          { name: 'Security Update', type: 'update_config', riskLevel: 'High' },
          { name: 'Resource Scaling', type: 'scale_resources', riskLevel: 'Medium' },
        ].map((template, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Badge variant={template.riskLevel === 'High' ? 'destructive' : 'secondary'}>
                  {template.riskLevel} Risk
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Settings Section
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Workflow Settings</h1>
        <p className="text-slate-400 mt-2">Configure workflow behavior and approval rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval Settings</CardTitle>
            <CardDescription>Configure approval requirements and thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-approve">Auto-approve low-risk actions</Label>
              <Switch id="auto-approve" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require-dual">Require dual approval for high-risk</Label>
              <Switch id="require-dual" defaultChecked />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-threshold">Risk threshold for approval</Label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure how notifications are sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email notifications</Label>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="slack-notifications">Slack notifications</Label>
              <Switch id="slack-notifications" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-frequency">Notification frequency</Label>
              <Select defaultValue="immediate">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly digest</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // History Section
  const renderHistory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflow History</h1>
          <p className="text-slate-400 mt-2">Complete history of workflow executions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow: any) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.id}</TableCell>
                  <TableCell>{workflow.type || 'Remediation'}</TableCell>
                  <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                  <TableCell>{new Date(workflow.createdAt || Date.now()).toLocaleDateString()}</TableCell>
                  <TableCell>2m 34s</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // User Management Section
  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-2">Manage user roles and permissions</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: 'Admin User', email: 'admin@company.com', role: 'Administrator', permissions: 'Full Access' },
                { name: 'John Doe', email: 'john@company.com', role: 'Approver', permissions: 'Approve Workflows' },
                { name: 'Jane Smith', email: 'jane@company.com', role: 'Viewer', permissions: 'View Only' },
              ].map((user, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>{user.permissions}</TableCell>
                  <TableCell>2 hours ago</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'pending':
        return renderPendingApprovals();
      case 'approved':
        return <div className="text-white">Approved workflows functionality coming soon...</div>;
      case 'rejected':
        return <div className="text-white">Rejected workflows functionality coming soon...</div>;
      case 'history':
        return renderHistory();
      case 'templates':
        return renderTemplates();
      case 'users':
        return renderUserManagement();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-dark-surface">
        <div className="w-64 border-r border-dark-border p-4 animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-10 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-surface">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r border-dark-border flex-shrink-0">
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <GitBranch className="text-white text-sm" size={16} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Workflows</h2>
                <p className="text-xs text-slate-400">Management Center</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/')}
              className="text-slate-400 hover:text-white"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={getNavItemClass(item.id)}
                onClick={() => setActiveSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <Icon size={16} />
                <span className="text-sm">{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}