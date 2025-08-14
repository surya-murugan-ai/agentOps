import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Clock, XCircle, Settings } from "lucide-react";

export default function WorkflowPage() {
  // Simple data fetching
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['/api/workflows'],
    refetchInterval: 30000,
  });

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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflow Management</h1>
          <p className="text-slate-400 mt-2">
            Manage complex multi-step approval workflows for remediation actions
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Configure Workflows
        </Button>
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
          <CardTitle>Active Workflows</CardTitle>
          <CardDescription>
            Manage approval workflows for remediation actions
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
                {workflows.slice(0, 10).map((workflow: any) => (
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
              <Settings className="h-12 w-12 mx-auto mb-4" />
              <p>No active workflows found</p>
              <p className="text-sm">Workflows will appear here when remediation actions require approval</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}