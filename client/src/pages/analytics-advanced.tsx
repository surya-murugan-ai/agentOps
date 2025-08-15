import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, TrendingUp, BarChart3, PieChart, LineChart, Settings, Download, Plus, Eye, Filter, X } from 'lucide-react';
import Sidebar from "@/components/dashboard/Sidebar";
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Dashboard configuration types
interface DashboardWidget {
  id: string;
  type: 'line' | 'bar' | 'doughnut' | 'scatter' | 'metric' | 'table';
  title: string;
  dataSource: string;
  timeRange: string;
  filters: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}

interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdvancedAnalytics() {
  const [selectedDashboard, setSelectedDashboard] = useState<string>('default');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isEditing, setIsEditing] = useState(false);
  
  // Filter states
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([
    {
      id: 'default',
      name: 'System Overview',
      description: 'Default system monitoring dashboard',
      widgets: [],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  // Fetch analytics data
  const { data: metricsData = {} } = useQuery({
    queryKey: ['/api/analytics/metrics', selectedTimeRange],
    refetchInterval: 30000,
  });

  const { data: trendsData = {} } = useQuery({
    queryKey: ['/api/analytics/trends', selectedTimeRange],
    refetchInterval: 60000,
  });

  const { data: alertsAnalytics = {} } = useQuery({
    queryKey: ['/api/analytics/alerts', selectedTimeRange],
    refetchInterval: 30000,
  });

  const { data: performanceData = {} } = useQuery({
    queryKey: ['/api/analytics/performance', selectedTimeRange],
    refetchInterval: 30000,
  });

  // Fetch real predictions data
  const { data: predictions = [] } = useQuery({
    queryKey: ['/api/predictions'],
    refetchInterval: 60000,
  });

  const { data: servers = [] } = useQuery({
    queryKey: ['/api/servers'],
    refetchInterval: 60000,
  });

  // Type-safe predictions data
  const safePredictions = (predictions as any[]) || [];
  const safeServers = (servers as any[]) || [];

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0'
        }
      },
      title: {
        display: false,
        color: '#e2e8f0'
      }
    },
    scales: {
      x: {
        grid: {
          color: '#334155'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      y: {
        grid: {
          color: '#334155'
        },
        ticks: {
          color: '#94a3b8'
        }
      }
    }
  };

  const handleCreateDashboard = () => {
    const newDashboard: CustomDashboard = {
      id: `dashboard-${Date.now()}`,
      name: `Custom Dashboard ${dashboards.length}`,
      description: 'Custom analytics dashboard',
      widgets: [],
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setDashboards([...dashboards, newDashboard]);
    setSelectedDashboard(newDashboard.id);
  };

  const handleExportReport = () => {
    const reportData = {
      timeRange: selectedTimeRange,
      metrics: metricsData,
      trends: trendsData,
      alerts: alertsAnalytics,
      performance: performanceData,
      predictions: safePredictions,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${selectedTimeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Sidebar />
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="page-title">Advanced Analytics</h1>
            <p className="text-slate-400 mt-1">Custom dashboards and advanced reporting</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32" data-testid="time-range-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                <SelectTrigger className="w-40" data-testid="environment-filter">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Environments</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-32" data-testid="severity-filter">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40" data-testid="server-filter">
                    <Filter size={16} className="mr-2" />
                    {selectedServers.length === 0 ? 'All Servers' : `${selectedServers.length} Selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-3">
                    <div className="font-medium text-sm">Select Servers</div>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedServers(safeServers.map((s: any) => s.id))}
                        className="text-xs h-6"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedServers([])}
                        className="text-xs h-6"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {safeServers.map((server: any) => (
                        <div key={server.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={server.id}
                            checked={selectedServers.includes(server.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedServers([...selectedServers, server.id]);
                              } else {
                                setSelectedServers(selectedServers.filter(id => id !== server.id));
                              }
                            }}
                          />
                          <label htmlFor={server.id} className="text-sm cursor-pointer flex-1">
                            <div className="font-medium">{server.hostname}</div>
                            <div className="text-xs text-slate-400">{server.environment}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  setSelectedServers([]);
                  setSelectedEnvironment('all');
                  setSelectedStatus('all');
                  setSelectedSeverity('all');
                }}
                data-testid="clear-filters-btn"
              >
                <X size={16} />
                Clear Filters
              </Button>
            </div>
            <Button variant="outline" onClick={handleExportReport} data-testid="export-report-btn">
              <Download size={16} className="mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Dashboard Management */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2" size={20} />
                  Dashboard Management
                </CardTitle>
                <CardDescription>Create and manage custom analytics dashboards</CardDescription>
              </div>
              <Button onClick={handleCreateDashboard} data-testid="create-dashboard-btn">
                <Plus size={16} className="mr-2" />
                Create Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
                <SelectTrigger className="w-64" data-testid="dashboard-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.name} {dashboard.isDefault && <Badge variant="secondary">Default</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                data-testid="edit-dashboard-btn"
              >
                <Settings size={16} className="mr-2" />
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter Summary */}
        {(selectedServers.length > 0 || selectedEnvironment !== 'all' || selectedStatus !== 'all' || selectedSeverity !== 'all') && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Filter size={16} />
                  Active Filters:
                  {selectedEnvironment !== 'all' && (
                    <Badge variant="secondary" className="capitalize">{selectedEnvironment}</Badge>
                  )}
                  {selectedStatus !== 'all' && (
                    <Badge variant="secondary" className="capitalize">{selectedStatus}</Badge>
                  )}
                  {selectedSeverity !== 'all' && (
                    <Badge variant="secondary" className="capitalize">{selectedSeverity}</Badge>
                  )}
                  {selectedServers.length > 0 && (
                    <Badge variant="secondary">{selectedServers.length} Server(s)</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Historical Trends</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="predictive" data-testid="tab-predictive">Predictive</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Health Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Health Trends</CardTitle>
                  <CardDescription>Resource usage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <Line
                    data={{
                      labels: metricsData.timestamps || [],
                      datasets: [
                        {
                          label: 'CPU Usage',
                          data: metricsData.cpuUsage || [],
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                        },
                        {
                          label: 'Memory Usage',
                          data: metricsData.memoryUsage || [],
                          borderColor: 'rgb(16, 185, 129)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.4,
                        }
                      ],
                    }}
                    options={chartOptions}
                  />
                </CardContent>
              </Card>

              {/* Alert Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Alert Distribution</CardTitle>
                  <CardDescription>Alerts by severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <Doughnut
                    data={{
                      labels: alertsAnalytics.labels || ['Info', 'Warning', 'Critical'],
                      datasets: [
                        {
                          data: alertsAnalytics.data || [0, 0, 0],
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(251, 191, 36, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                          ],
                          borderColor: [
                            'rgb(59, 130, 246)',
                            'rgb(251, 191, 36)',
                            'rgb(239, 68, 68)',
                          ],
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'bottom' as const,
                          labels: {
                            color: '#e2e8f0'
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>

              {/* Performance Correlation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Correlation</CardTitle>
                  <CardDescription>CPU vs Response Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <Scatter
                    data={{
                      datasets: [
                        {
                          label: 'Server Performance',
                          data: performanceData.correlation || [],
                          backgroundColor: 'rgba(139, 92, 246, 0.6)',
                          borderColor: 'rgb(139, 92, 246)',
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ...chartOptions.scales.x,
                          title: {
                            display: true,
                            text: 'CPU Usage (%)',
                            color: '#94a3b8'
                          }
                        },
                        y: {
                          ...chartOptions.scales.y,
                          title: {
                            display: true,
                            text: 'Response Time (ms)',
                            color: '#94a3b8'
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical CPU Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CPU Usage Trends</CardTitle>
                  <CardDescription>Historical CPU utilization patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <Line
                    data={{
                      labels: trendsData.timestamps || [],
                      datasets: [
                        {
                          label: 'Average CPU',
                          data: trendsData.cpuTrend || [],
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.4,
                        },
                        {
                          label: 'Peak CPU',
                          data: trendsData.cpuPeak || [],
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          tension: 0.4,
                        }
                      ],
                    }}
                    options={chartOptions}
                  />
                </CardContent>
              </Card>

              {/* Memory Usage Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Usage Trends</CardTitle>
                  <CardDescription>Historical memory utilization patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <Line
                    data={{
                      labels: trendsData.timestamps || [],
                      datasets: [
                        {
                          label: 'Average Memory',
                          data: trendsData.memoryTrend || [],
                          borderColor: 'rgb(16, 185, 129)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          tension: 0.4,
                        },
                        {
                          label: 'Peak Memory',
                          data: trendsData.memoryPeak || [],
                          borderColor: 'rgb(251, 191, 36)',
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          tension: 0.4,
                        }
                      ],
                    }}
                    options={chartOptions}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Time Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Response Time Analysis</CardTitle>
                  <CardDescription>Application response time metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Bar
                    data={{
                      labels: performanceData.serverLabels || [],
                      datasets: [
                        {
                          label: 'Avg Response Time (ms)',
                          data: performanceData.responseTimes || [],
                          backgroundColor: 'rgba(139, 92, 246, 0.8)',
                          borderColor: 'rgb(139, 92, 246)',
                          borderWidth: 1,
                        }
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Response Time (ms)',
                            color: '#94a3b8'
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>

              {/* Throughput Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Throughput Analysis</CardTitle>
                  <CardDescription>Requests per minute by server</CardDescription>
                </CardHeader>
                <CardContent>
                  <Bar
                    data={{
                      labels: performanceData.serverLabels || [],
                      datasets: [
                        {
                          label: 'Requests/min',
                          data: performanceData.throughput || [],
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgb(34, 197, 94)',
                          borderWidth: 1,
                        }
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Requests per Minute',
                            color: '#94a3b8'
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Predictive Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Predictive Analytics</CardTitle>
                  <CardDescription>AI-powered predictions and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {safePredictions.length > 0 ? (
                      safePredictions.slice(0, 5).map((prediction: any, index: number) => (
                        <div key={index} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-white">
                              {safeServers.find(s => s.id === prediction.serverId)?.hostname || `Server ${prediction.serverId}`}
                            </div>
                            <Badge variant={parseFloat(prediction.confidence) > 80 ? "default" : "secondary"}>
                              {Math.round(parseFloat(prediction.confidence))}% confidence
                            </Badge>
                          </div>
                          <p className="text-slate-300 text-sm">
                            Predicting {prediction.metricType} will {parseFloat(prediction.predictedValue) > parseFloat(prediction.currentValue) ? 'increase' : 'decrease'} to {parseFloat(prediction.predictedValue).toFixed(1)}%
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <span>Impact: {parseFloat(prediction.predictedValue) > parseFloat(prediction.currentValue) * 1.2 ? 'High' : parseFloat(prediction.predictedValue) > parseFloat(prediction.currentValue) * 1.1 ? 'Medium' : 'Low'}</span>
                            <span>•</span>
                            <span>Timeframe: {new Date(prediction.predictionTime) > new Date(Date.now() + 24*60*60*1000) ? 'Next 24h' : 'Next hour'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <PieChart size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No predictive data available</p>
                        <p className="text-sm">Predictions will appear as the AI agents analyze your server data</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Report Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generate Reports</CardTitle>
                  <CardDescription>Create comprehensive analytics reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Performance Report</h4>
                        <p className="text-sm text-slate-400 mb-4">CPU, memory, and response time analysis</p>
                        <Button size="sm" className="w-full">Generate</Button>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Security Report</h4>
                        <p className="text-sm text-slate-400 mb-4">Security alerts and compliance status</p>
                        <Button size="sm" className="w-full">Generate</Button>
                      </Card>
                      <Card className="p-4">
                        <h4 className="font-medium mb-2">Trend Analysis</h4>
                        <p className="text-sm text-slate-400 mb-4">Historical trends and forecasting</p>
                        <Button size="sm" className="w-full">Generate</Button>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}