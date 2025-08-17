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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  BarChart3,
  X
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DataViewPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTable, setSelectedTable] = useState("servers");
  const [showVisualizeModal, setShowVisualizeModal] = useState(false);
  const [_, setLocation] = useLocation();

  // Fetch data for different tables - always fetch counts for buttons
  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ["/api/servers"]
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics/all"],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/all?limit=50000&_=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: 10000,  // Refresh every 10 seconds for real-time updates
    staleTime: 0  // Always consider data stale to force fresh fetches
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000,
    staleTime: 0
  });

  const { data: remediations, isLoading: remediationsLoading } = useQuery({
    queryKey: ["/api/remediation-actions"],
    refetchInterval: 10000,
    staleTime: 0
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
    refetchInterval: 10000,
    staleTime: 0
  });

  // Filter and search data based on current filters
  const filterData = (data: any[], dataType: string) => {
    if (!Array.isArray(data)) return [];
    
    let filtered = data;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        switch (dataType) {
          case "servers":
            return (
              item.hostname?.toLowerCase().includes(searchLower) ||
              item.ipAddress?.toLowerCase().includes(searchLower) ||
              item.environment?.toLowerCase().includes(searchLower) ||
              item.location?.toLowerCase().includes(searchLower)
            );
          case "metrics":
            const server = servers?.find((s: any) => s.id === item.serverId);
            return server?.hostname?.toLowerCase().includes(searchLower);
          case "alerts":
            return (
              item.title?.toLowerCase().includes(searchLower) ||
              item.description?.toLowerCase().includes(searchLower) ||
              item.server?.hostname?.toLowerCase().includes(searchLower)
            );
          case "remediations":
            return (
              item.title?.toLowerCase().includes(searchLower) ||
              item.description?.toLowerCase().includes(searchLower) ||
              item.server?.hostname?.toLowerCase().includes(searchLower)
            );
          case "audit":
            return (
              item.action?.toLowerCase().includes(searchLower) ||
              item.details?.toLowerCase().includes(searchLower) ||
              item.agentId?.toLowerCase().includes(searchLower)
            );
          default:
            return true;
        }
      });
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => {
        switch (dataType) {
          case "servers":
            return item.status?.toLowerCase() === filterStatus.toLowerCase();
          case "alerts":
            return (
              item.status?.toLowerCase() === filterStatus.toLowerCase() ||
              item.severity?.toLowerCase() === filterStatus.toLowerCase()
            );
          case "remediations":
            return item.status?.toLowerCase() === filterStatus.toLowerCase();
          case "audit":
            return item.status?.toLowerCase() === filterStatus.toLowerCase();
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

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
              {filterData(servers || [], "servers").map((server: any) => (
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
              {filterData(metrics || [], "metrics").slice(0, 50).map((metric: any) => (
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
              {filterData(alerts || [], "alerts").map((alert: any) => (
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
              {filterData(remediations || [], "remediations").map((remediation: any) => (
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
              {filterData(auditLogs || [], "audit").slice(0, 50).map((log: any) => (
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
        return { 
          total: filterData(servers || [], "servers").length, 
          icon: Server 
        };
      case "metrics":
        return { 
          total: filterData(metrics || [], "metrics").length, 
          icon: Activity 
        };
      case "alerts":
        return { 
          total: filterData(alerts || [], "alerts").length, 
          icon: AlertTriangle 
        };
      case "remediations":
        return { 
          total: filterData(remediations || [], "remediations").length, 
          icon: Wrench 
        };
      case "audit":
        return { 
          total: filterData(auditLogs || [], "audit").length, 
          icon: Database 
        };
      default:
        return { total: 0, icon: Database };
    }
  };

  const stats = getTableStats();
  const IconComponent = stats.icon;

  // Generate visualization data based on selected table
  const getVisualizationData = () => {
    switch (selectedTable) {
      case "metrics":
        if (!Array.isArray(metrics) || metrics.length === 0) return null;
        
        // CPU usage over time (last 20 records)
        const recentMetrics = metrics.slice(0, 20).reverse();
        const cpuData = {
          labels: recentMetrics.map((_, index) => `T-${20-index}`),
          datasets: [{
            label: 'CPU Usage (%)',
            data: recentMetrics.map(m => parseFloat(m.cpuUsage)),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        };

        // Server distribution
        const serverCounts = {};
        metrics.forEach(m => {
          const hostname = servers?.find(s => s.id === m.serverId)?.hostname || 'Unknown';
          serverCounts[hostname] = (serverCounts[hostname] || 0) + 1;
        });

        const serverDistribution = {
          labels: Object.keys(serverCounts),
          datasets: [{
            data: Object.values(serverCounts),
            backgroundColor: [
              '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
              '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
            ]
          }]
        };

        return { cpuData, serverDistribution };

      case "alerts":
        if (!Array.isArray(alerts) || alerts.length === 0) return null;
        
        // Alert severity distribution
        const severityCounts = { critical: 0, warning: 0, info: 0 };
        alerts.forEach(alert => {
          severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
        });

        const alertSeverity = {
          labels: ['Critical', 'Warning', 'Info'],
          datasets: [{
            data: [severityCounts.critical, severityCounts.warning, severityCounts.info],
            backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6']
          }]
        };

        // Alert status distribution
        const statusCounts = {};
        alerts.forEach(alert => {
          statusCounts[alert.status] = (statusCounts[alert.status] || 0) + 1;
        });

        const alertStatus = {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280']
          }]
        };

        return { alertSeverity, alertStatus };

      case "servers":
        if (!Array.isArray(servers) || servers.length === 0) return null;
        
        // Server status distribution
        const serverStatusCounts = {};
        servers.forEach(server => {
          serverStatusCounts[server.status] = (serverStatusCounts[server.status] || 0) + 1;
        });

        const serverStatusData = {
          labels: Object.keys(serverStatusCounts),
          datasets: [{
            data: Object.values(serverStatusCounts),
            backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280']
          }]
        };

        // Environment distribution
        const envCounts = {};
        servers.forEach(server => {
          envCounts[server.environment] = (envCounts[server.environment] || 0) + 1;
        });

        const envData = {
          labels: Object.keys(envCounts),
          datasets: [{
            label: 'Servers by Environment',
            data: Object.values(envCounts),
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
          }]
        };

        return { serverStatusData, envData };

      default:
        return null;
    }
  };

  const visualizationData = getVisualizationData();

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
              <Dialog open={showVisualizeModal} onOpenChange={setShowVisualizeModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-600 text-slate-300">
                    <BarChart3 size={16} className="mr-2" />
                    Visualize
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-dark-card border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <BarChart3 size={20} />
                      Data Visualization - {selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1)}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    {visualizationData ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {selectedTable === "metrics" && visualizationData.cpuData && (
                          <>
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">CPU Usage Trend</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Line
                                    data={visualizationData.cpuData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { labels: { color: '#fff' } }
                                      },
                                      scales: {
                                        x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
                                        y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">Metrics by Server</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Pie
                                    data={visualizationData.serverDistribution}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { labels: { color: '#fff' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        )}
                        
                        {selectedTable === "alerts" && visualizationData.alertSeverity && (
                          <>
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">Alert Severity Distribution</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Pie
                                    data={visualizationData.alertSeverity}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { labels: { color: '#fff' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">Alert Status</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Bar
                                    data={visualizationData.alertStatus}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { display: false }
                                      },
                                      scales: {
                                        x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
                                        y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        )}
                        
                        {selectedTable === "servers" && visualizationData.serverStatusData && (
                          <>
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">Server Status Distribution</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Pie
                                    data={visualizationData.serverStatusData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { labels: { color: '#fff' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card className="bg-slate-800 border-slate-700">
                              <CardHeader>
                                <CardTitle className="text-white text-sm">Servers by Environment</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-64">
                                  <Bar
                                    data={visualizationData.envData}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { display: false }
                                      },
                                      scales: {
                                        x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
                                        y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } }
                                      }
                                    }}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="mx-auto text-slate-400 mb-4" size={48} />
                        <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
                        <p className="text-slate-400">
                          No data available for visualization in the selected data type.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t border-slate-700">
                      <Button
                        variant="outline"
                        onClick={() => setShowVisualizeModal(false)}
                        className="border-slate-600 text-slate-300"
                      >
                        <X size={16} className="mr-2" />
                        Close
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                    {selectedTable === "servers" && (
                      <>
                        <SelectItem value="healthy">Healthy</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </>
                    )}
                    {selectedTable === "alerts" && (
                      <>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </>
                    )}
                    {selectedTable === "remediations" && (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </>
                    )}
                    {selectedTable === "audit" && (
                      <>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                      </>
                    )}
                    {selectedTable === "metrics" && (
                      <>
                        <SelectItem value="healthy">Healthy Servers</SelectItem>
                        <SelectItem value="warning">Warning Servers</SelectItem>
                        <SelectItem value="critical">Critical Servers</SelectItem>
                      </>
                    )}
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