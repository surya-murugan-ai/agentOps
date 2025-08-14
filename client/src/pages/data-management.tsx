import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Search, Trash2, Edit, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/dashboard/Sidebar';

export default function DataManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('servers');

  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['/api/servers'],
    refetchInterval: 30000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/metrics/range'],
    refetchInterval: 30000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/alerts', {}],
    refetchInterval: 30000,
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  const { data: remediations, isLoading: remediationsLoading } = useQuery({
    queryKey: ['/api/remediation-actions', {}],
    refetchInterval: 30000,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['/api/audit-logs', {}],
    refetchInterval: 30000,
  });

  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: string) => {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete server');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Server deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const clearMetricsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/metrics/clear', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear metrics');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/range'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Metrics data cleared successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Clear Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async (dataType: string) => {
      const response = await fetch(`/api/export/${dataType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to export ${dataType} data`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (_, dataType) => {
      toast({ title: `${dataType} data exported successfully` });
    },
    onError: (error) => {
      toast({ 
        title: "Export Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  // Add delete mutations for other data types
  const deleteMetricMutation = useMutation({
    mutationFn: async (metricId: string) => {
      const response = await fetch(`/api/metrics/${metricId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete metric');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/range'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Metric deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete alert');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', {}] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Alert deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const deleteRemediationMutation = useMutation({
    mutationFn: async (remediationId: string) => {
      const response = await fetch(`/api/remediation-actions/${remediationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete remediation action');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remediation-actions', {}] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({ title: "Remediation action deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const deleteAuditLogMutation = useMutation({
    mutationFn: async (auditLogId: string) => {
      const response = await fetch(`/api/audit-logs/${auditLogId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete audit log');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs', {}] });
      toast({ title: "Audit log deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Delete Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const filteredServers = Array.isArray(servers) ? servers.filter((server: any) =>
    server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.ipAddress.includes(searchTerm) ||
    server.environment.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredMetrics = Array.isArray(metrics) ? metrics.filter((metric: any) =>
    metric.server?.hostname.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredAlerts = Array.isArray(alerts) ? alerts.filter((alert: any) =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.server?.hostname.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/20 text-success border-success/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'critical': return 'bg-error/20 text-error border-error/30';
      case 'active': return 'bg-success/20 text-success border-success/30';
      case 'inactive': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-600/30';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-error/20 text-error border-error/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'info': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-600/30';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show loading state while any critical data is loading
  if (serversLoading && metricsLoading && alertsLoading) {
    return (
      <div className="min-h-screen bg-dark-background">
        <Sidebar />
        <div className="ml-64 p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-white text-lg">Loading data management...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Data Management</h1>
            <p className="text-slate-400 mt-1">View and manage all infrastructure data</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-dark-surface border-dark-border text-white w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries();
                toast({ title: "Data refreshed" });
              }}
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-dark-surface border-dark-border">
            <TabsTrigger value="servers">Servers ({Array.isArray(servers) ? servers.length : 0})</TabsTrigger>
            <TabsTrigger value="metrics">Metrics ({Array.isArray(metrics) ? metrics.length : 0})</TabsTrigger>
            <TabsTrigger value="alerts">Alerts ({Array.isArray(alerts) ? alerts.length : 0})</TabsTrigger>
            <TabsTrigger value="agents">Agents ({Array.isArray(agents) ? agents.length : 0})</TabsTrigger>
            <TabsTrigger value="remediations">Remediations ({Array.isArray(remediations) ? remediations.length : 0})</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs ({Array.isArray(auditLogs) ? auditLogs.length : 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Server Inventory</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportDataMutation.mutate('servers')}
                  disabled={exportDataMutation.isPending}
                >
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {serversLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Hostname</TableHead>
                        <TableHead className="text-slate-300">IP Address</TableHead>
                        <TableHead className="text-slate-300">Environment</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Location</TableHead>
                        <TableHead className="text-slate-300">Last Heartbeat</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(filteredServers) && filteredServers.map((server: any) => (
                        <TableRow key={server.id}>
                          <TableCell className="text-white font-medium">{server.hostname}</TableCell>
                          <TableCell className="text-slate-300">{server.ipAddress}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(server.environment)} variant="outline">
                              {server.environment}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(server.status)} variant="outline">
                              {server.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">{server.location}</TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(server.lastHeartbeat).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-error hover:text-error"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${server.hostname}?`)) {
                                    deleteServerMutation.mutate(server.id);
                                  }
                                }}
                              >
                                <Trash2 size={16} />
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
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Performance Metrics</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportDataMutation.mutate('metrics')}
                    disabled={exportDataMutation.isPending}
                  >
                    <Download size={16} className="mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-warning hover:text-warning"
                    onClick={() => {
                      if (confirm("Are you sure you want to clear all metrics data? This action cannot be undone.")) {
                        clearMetricsMutation.mutate();
                      }
                    }}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Server</TableHead>
                        <TableHead className="text-slate-300">CPU %</TableHead>
                        <TableHead className="text-slate-300">Memory %</TableHead>
                        <TableHead className="text-slate-300">Disk %</TableHead>
                        <TableHead className="text-slate-300">Network Latency</TableHead>
                        <TableHead className="text-slate-300">Process Count</TableHead>
                        <TableHead className="text-slate-300">Timestamp</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(filteredMetrics) && filteredMetrics.slice(0, 50).map((metric: any) => (
                        <TableRow key={metric.id}>
                          <TableCell className="text-white font-medium">
                            {metric.server?.hostname || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-slate-300">{parseFloat(metric.cpuUsage).toFixed(1)}%</TableCell>
                          <TableCell className="text-slate-300">
                            {((parseFloat(metric.memoryUsage) / metric.memoryTotal) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {((parseFloat(metric.diskUsage) / metric.diskTotal) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-slate-300">{metric.networkLatency}ms</TableCell>
                          <TableCell className="text-slate-300">{metric.processCount}</TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(metric.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-error hover:text-error"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this metric?")) {
                                  deleteMetricMutation.mutate(metric.id);
                                }
                              }}
                              disabled={deleteMetricMutation.isPending}
                              data-testid={`button-delete-metric-${metric.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Alert Management</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportDataMutation.mutate('alerts')}
                  disabled={exportDataMutation.isPending}
                >
                  <Download size={16} className="mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Title</TableHead>
                        <TableHead className="text-slate-300">Server</TableHead>
                        <TableHead className="text-slate-300">Severity</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Metric</TableHead>
                        <TableHead className="text-slate-300">Value</TableHead>
                        <TableHead className="text-slate-300">Created</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(filteredAlerts) && filteredAlerts.map((alert: any) => (
                        <TableRow key={alert.id}>
                          <TableCell className="text-white font-medium">{alert.title}</TableCell>
                          <TableCell className="text-slate-300">
                            {alert.server?.hostname || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(alert.severity)} variant="outline">
                              {alert.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(alert.status)} variant="outline">
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">{alert.metricType}</TableCell>
                          <TableCell className="text-slate-300">
                            {alert.metricValue ? parseFloat(alert.metricValue).toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(alert.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-error hover:text-error"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this alert?")) {
                                  deleteAlertMutation.mutate(alert.id);
                                }
                              }}
                              disabled={deleteAlertMutation.isPending}
                              data-testid={`button-delete-alert-${alert.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>AI Agents Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentsLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Agent Name</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">CPU Usage</TableHead>
                        <TableHead className="text-slate-300">Memory Usage</TableHead>
                        <TableHead className="text-slate-300">Processed Count</TableHead>
                        <TableHead className="text-slate-300">Error Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(agents) && agents.map((agent: any) => (
                        <TableRow key={agent.id}>
                          <TableCell className="text-white font-medium">{agent.name}</TableCell>
                          <TableCell className="text-slate-300">{agent.type}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(agent.status)} variant="outline">
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">{agent.cpuUsage}%</TableCell>
                          <TableCell className="text-slate-300">{agent.memoryUsage} MB</TableCell>
                          <TableCell className="text-slate-300">{agent.processedCount}</TableCell>
                          <TableCell className="text-slate-300">{agent.errorCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remediations" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Remediation Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remediationsLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Title</TableHead>
                        <TableHead className="text-slate-300">Server</TableHead>
                        <TableHead className="text-slate-300">Action Type</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Confidence</TableHead>
                        <TableHead className="text-slate-300">Downtime Est.</TableHead>
                        <TableHead className="text-slate-300">Created</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(remediations) && remediations.map((remediation: any) => (
                        <TableRow key={remediation.id}>
                          <TableCell className="text-white font-medium">{remediation.title}</TableCell>
                          <TableCell className="text-slate-300">
                            {remediation.server?.hostname || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-slate-300">{remediation.actionType}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(remediation.status)} variant="outline">
                              {remediation.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">{remediation.confidence}%</TableCell>
                          <TableCell className="text-slate-300">{remediation.estimatedDowntime}s</TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(remediation.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-error hover:text-error"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this remediation action?")) {
                                  deleteRemediationMutation.mutate(remediation.id);
                                }
                              }}
                              disabled={deleteRemediationMutation.isPending}
                              data-testid={`button-delete-remediation-${remediation.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database size={20} />
                  <span>Audit Trail</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Action</TableHead>
                        <TableHead className="text-slate-300">User</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Details</TableHead>
                        <TableHead className="text-slate-300">Impact</TableHead>
                        <TableHead className="text-slate-300">Timestamp</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(auditLogs) && auditLogs.slice(0, 50).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-white font-medium">{log.action}</TableCell>
                          <TableCell className="text-slate-300">{log.userId || 'System'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(log.status)} variant="outline">
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-xs truncate">{log.details}</TableCell>
                          <TableCell className="text-slate-300 max-w-xs truncate">{log.impact}</TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-error hover:text-error"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this audit log?")) {
                                  deleteAuditLogMutation.mutate(log.id);
                                }
                              }}
                              disabled={deleteAuditLogMutation.isPending}
                              data-testid={`button-delete-audit-${log.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}