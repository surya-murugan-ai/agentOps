import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Server, 
  AlertTriangle, 
  Wrench, 
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  BarChart3
} from "lucide-react";

export default function DataViewPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTable, setSelectedTable] = useState("servers");
  const [_, setLocation] = useLocation();

  // Fetch data for different tables - always fetch counts for buttons
  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ["/api/servers"]
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics/all"],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/all?limit=1000&_=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: 10000,  // Refresh every 10 seconds for real-time updates
    staleTime: 0,  // Always consider data stale to force fresh fetches
    cacheTime: 5000  // Keep cache for only 5 seconds
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/alerts"]
  });

  const { data: remediations, isLoading: remediationsLoading } = useQuery({
    queryKey: ["/api/remediation-actions"]
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["/api/audit-logs"]
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy": case "active": case "running": case "completed": case "approved":
        return "bg-success/20 text-success border-success";
      case "warning": case "pending": case "acknowledged":
        return "bg-warning/20 text-warning border-warning";
      case "critical": case "error": case "failed": case "rejected":
        return "bg-error/20 text-error border-error";
      case "inactive": case "stopped":
        return "bg-slate-500/20 text-slate-400 border-slate-500";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "info":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      case "warning":
        return "bg-warning/20 text-warning border-warning";
      case "critical":
        return "bg-error/20 text-error border-error";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500";
    }
  };

  const renderTableContent = () => {
    switch (selectedTable) {
      case "servers":
        if (serversLoading) {
          return (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          );
        }
        
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Hostname</TableHead>
                <TableHead className="text-slate-300">IP Address</TableHead>
                <TableHead className="text-slate-300">Environment</TableHead>
                <TableHead className="text-slate-300">Location</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(servers) && servers.map((server: any) => (
                <TableRow key={server.id}>
                  <TableCell className="text-white font-medium">{server.hostname}</TableCell>
                  <TableCell className="text-slate-300">{server.ipAddress}</TableCell>
                  <TableCell className="text-slate-300">{server.environment}</TableCell>
                  <TableCell className="text-slate-300">{server.location}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(server.status)} variant="outline">
                      {server.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {server.updatedAt ? new Date(server.updatedAt).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "metrics":
        if (metricsLoading) {
          return (
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          );
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Server</TableHead>
                <TableHead className="text-slate-300">CPU Usage</TableHead>
                <TableHead className="text-slate-300">Memory Usage</TableHead>
                <TableHead className="text-slate-300">Disk Usage</TableHead>
                <TableHead className="text-slate-300">Process Count</TableHead>
                <TableHead className="text-slate-300">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(metrics) && metrics.slice(0, 50).map((metric: any) => (
                <TableRow key={metric.id}>
                  <TableCell className="text-white font-medium">
                    {(() => {
                      const server = servers?.find((s: any) => s.id === metric.serverId);
                      return server?.hostname || metric.serverId?.slice(0, 8) || 'Unknown';
                    })()}
                  </TableCell>
                  <TableCell className="text-slate-300">{parseFloat(metric.cpuUsage).toFixed(1)}%</TableCell>
                  <TableCell className="text-slate-300">{parseFloat(metric.memoryUsage).toFixed(1)}%</TableCell>
                  <TableCell className="text-slate-300">{parseFloat(metric.diskUsage).toFixed(1)}%</TableCell>
                  <TableCell className="text-slate-300">{metric.processCount}</TableCell>
                  <TableCell className="text-slate-300">
                    {new Date(metric.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "alerts":
        if (alertsLoading) {
          return (
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          );
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Title</TableHead>
                <TableHead className="text-slate-300">Server</TableHead>
                <TableHead className="text-slate-300">Severity</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Metric Type</TableHead>
                <TableHead className="text-slate-300">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(alerts) && alerts.map((alert: any) => (
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
                    {new Date(alert.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "remediations":
        if (remediationsLoading) {
          return (
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          );
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Title</TableHead>
                <TableHead className="text-slate-300">Server</TableHead>
                <TableHead className="text-slate-300">Action Type</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Confidence</TableHead>
                <TableHead className="text-slate-300">Created</TableHead>
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
                  <TableCell className="text-slate-300">
                    {new Date(remediation.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "audit":
        if (auditLoading) {
          return (
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded"></div>
              ))}
            </div>
          );
        }

        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-300">Action</TableHead>
                <TableHead className="text-slate-300">User</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Details</TableHead>
                <TableHead className="text-slate-300">Impact</TableHead>
                <TableHead className="text-slate-300">Timestamp</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return <div>Select a data source to view</div>;
    }
  };

  const getTableStats = () => {
    switch (selectedTable) {
      case "servers":
        return { total: Array.isArray(servers) ? servers.length : 0, icon: Server };
      case "metrics":
        return { total: Array.isArray(metrics) ? metrics.length : 0, icon: Activity };
      case "alerts":
        return { total: Array.isArray(alerts) ? alerts.length : 0, icon: AlertTriangle };
      case "remediations":
        return { total: Array.isArray(remediations) ? remediations.length : 0, icon: Wrench };
      case "audit":
        return { total: Array.isArray(auditLogs) ? auditLogs.length : 0, icon: Database };
      default:
        return { total: 0, icon: Database };
    }
  };

  const stats = getTableStats();
  const IconComponent = stats.icon;

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Eye className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Data Viewer</h1>
                <p className="text-slate-400">Browse and analyze system data</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="border-slate-600 text-slate-300">
                <Download size={16} className="mr-2" />
                Export
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300">
                <BarChart3 size={16} className="mr-2" />
                Visualize
              </Button>
            </div>
          </div>

          {/* Data Source Selector */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { key: "servers", label: "Servers", icon: Server, count: Array.isArray(servers) ? servers.length : 0 },
              { key: "metrics", label: "Metrics", icon: Activity, count: Array.isArray(metrics) ? metrics.length : 0 },
              { key: "alerts", label: "Alerts", icon: AlertTriangle, count: Array.isArray(alerts) ? alerts.length : 0 },
              { key: "remediations", label: "Remediations", icon: Wrench, count: Array.isArray(remediations) ? remediations.length : 0 },
              { key: "audit", label: "Audit Logs", icon: Database, count: Array.isArray(auditLogs) ? auditLogs.length : 0 }
            ].map((source) => {
              const IconComp = source.icon;
              const isSelected = selectedTable === source.key;
              return (
                <Card 
                  key={source.key}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-primary/20 border-primary/50" 
                      : "bg-dark-surface border-dark-border hover:bg-slate-700/50"
                  }`}
                  onClick={() => {
                    setSelectedTable(source.key);
                    // Only navigate to other pages for non-data viewing items
                    // Keep metrics, servers, alerts, remediations, and audit data in this view
                  }}
                  data-testid={`data-source-${source.key}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <IconComp size={20} className={isSelected ? "text-primary" : "text-slate-400"} />
                      <div>
                        <h3 className={`font-medium ${isSelected ? "text-primary" : "text-white"}`}>
                          {source.label}
                        </h3>
                        <p className="text-xs text-slate-400">{source.count} records</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters and Search */}
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                      data-testid="search-input"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                    <Filter size={16} className="mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <IconComponent size={20} />
                <span>{selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1)} Data</span>
                <span className="ml-auto text-sm text-slate-400">
                  {stats.total} records
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-96">
                {renderTableContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}