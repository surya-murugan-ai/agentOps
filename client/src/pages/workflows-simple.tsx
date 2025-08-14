import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Clock, XCircle, Settings, BarChart3, FileText, Users, Filter, History, GitBranch, ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function WorkflowPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [, setLocation] = useLocation();
  
  // Simple data fetching
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['/api/workflows'],
    refetchInterval: 30000,
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

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'pending':
        return renderPendingApprovals();
      case 'approved':
        return renderApproved();
      case 'rejected':
        return renderRejected();
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

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflow Overview</h1>
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
            <Settings className="w-4 h-4 mr-2" />
            Configure Workflows
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Pending Approvals</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(workflows) ? workflows.filter((w: any) => w.status === 'pending').length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Approved Today</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(workflows) ? workflows.filter((w: any) => w.status === 'approved').length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(workflows) ? workflows.filter((w: any) => w.status === 'in_progress').length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Rejected</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(workflows) ? workflows.filter((w: any) => w.status === 'rejected').length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Workflow Activity</CardTitle>
          <CardDescription>
            Latest workflow submissions and approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(workflows) && workflows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow ID</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.slice(0, 5).map((workflow: any) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-mono text-sm">
                      {workflow.id?.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{workflow.title || 'Remediation Action'}</p>
                        <p className="text-sm text-slate-400">{workflow.description || 'No description'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={workflow.riskScore > 75 ? "destructive" : workflow.riskScore > 50 ? "secondary" : "default"}>
                        {workflow.riskScore || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(workflow.status || 'pending')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {new Date(workflow.createdAt || Date.now()).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <GitBranch className="h-12 w-12 mx-auto mb-4" />
              <p>No workflows found</p>
              <p className="text-sm">Workflows will appear here when remediation actions require approval</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPendingApprovals = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
        <p className="text-slate-400 mt-2">
          Workflows waiting for your approval
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p>No pending approvals</p>
            <p className="text-sm">Pending workflows will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderApproved = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Approved Workflows</h1>
        <p className="text-slate-400 mt-2">
          Successfully approved workflow requests
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
            <p>No approved workflows</p>
            <p className="text-sm">Approved workflows will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRejected = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Rejected Workflows</h1>
        <p className="text-slate-400 mt-2">
          Workflows that were rejected or declined
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <p>No rejected workflows</p>
            <p className="text-sm">Rejected workflows will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Workflow History</h1>
        <p className="text-slate-400 mt-2">
          Complete history of all workflow activities
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <History className="h-12 w-12 mx-auto mb-4" />
            <p>Workflow history</p>
            <p className="text-sm">Historical workflow data will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Workflow Templates</h1>
        <p className="text-slate-400 mt-2">
          Manage and configure workflow templates
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <p>Workflow templates</p>
            <p className="text-sm">Create and manage workflow templates here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <p className="text-slate-400 mt-2">
          Manage workflow users and permissions
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p>User management</p>
            <p className="text-sm">Manage workflow users and roles here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Workflow Settings</h1>
        <p className="text-slate-400 mt-2">
          Configure workflow system settings
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-400">
            <Settings className="h-12 w-12 mx-auto mb-4" />
            <p>Workflow settings</p>
            <p className="text-sm">Configure workflow system settings here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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

        <nav className="p-4 space-y-1 overflow-y-auto h-full">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={getNavItemClass(item.id)}
                data-testid={`nav-workflow-${item.id}`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}