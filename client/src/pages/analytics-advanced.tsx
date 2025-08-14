import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, BarChart3, PieChart, LineChart, Settings, Download, Plus, Eye } from 'lucide-react';
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

  // Chart configurations
  const createLineChart = (data: any, title: string) => ({
    type: 'line' as const,
    data: {
      labels: data?.timestamps || [],
      datasets: [
        {
          label: 'CPU Usage %',
          data: data?.cpu || [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Memory Usage %',
          data: data?.memory || [],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Disk Usage %',
          data: data?.disk || [],
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
        }
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: title },
      },
      scales: {
        x: { type: 'time' as const, time: { unit: 'hour' as const } },
        y: { beginAtZero: true, max: 100 },
      },
    },
  });

  const createBarChart = (data: any, title: string) => ({
    type: 'bar' as const,
    data: {
      labels: data?.servers || [],
      datasets: [
        {
          label: 'Critical Alerts',
          data: data?.critical || [],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
        {
          label: 'Warning Alerts',
          data: data?.warning || [],
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
        },
        {
          label: 'Info Alerts',
          data: data?.info || [],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        }
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: title },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  const createDoughnutChart = (data: any, title: string) => ({
    type: 'doughnut' as const,
    data: {
      labels: data?.labels || ['Critical', 'Warning', 'Info', 'Resolved'],
      datasets: [
        {
          data: data?.values || [0, 0, 0, 0],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' as const },
        title: { display: true, text: title },
      },
    },
  });

  const predictiveMaintenanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Predicted Failures',
        data: performanceData?.predictions || [2, 3, 1, 4],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Maintenance Windows',
        data: performanceData?.maintenance || [1, 2, 2, 1],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      }
    ],
  };

  const handleCreateDashboard = () => {
    const newDashboard: CustomDashboard = {
      id: `dashboard-${Date.now()}`,
      name: `Custom Dashboard ${dashboards.length}`,
      description: 'New custom dashboard',
      widgets: [],
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setDashboards([...dashboards, newDashboard]);
    setSelectedDashboard(newDashboard.id);
    setIsEditing(true);
  };

  const handleExportReport = async () => {
    // Generate and download report
    const reportData = {
      dashboard: selectedDashboard,
      timeRange: selectedTimeRange,
      generatedAt: new Date().toISOString(),
      metrics: metricsData,
      trends: trendsData,
      alerts: alertsAnalytics,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentops-report-${selectedTimeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6" data-testid="advanced-analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="page-title">Advanced Analytics</h1>
          <p className="text-slate-400 mt-1">Custom dashboards and advanced reporting</p>
        </div>
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
          <Button variant="outline" onClick={handleExportReport} data-testid="export-report-btn">
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Dashboard Management */}
      <Card>
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
              </CardHeader>
              <CardContent>
                <Line {...createLineChart(metricsData, 'Resource Usage Over Time')} />
              </CardContent>
            </Card>

            {/* Alert Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <Doughnut {...createDoughnutChart(alertsAnalytics, 'Alert Severity Breakdown')} />
              </CardContent>
            </Card>

            {/* Server Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Server Alert Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Bar {...createBarChart(alertsAnalytics, 'Alerts by Server')} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Historical CPU Trends</CardTitle>
                <CardDescription>CPU usage patterns over selected time period</CardDescription>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: trendsData?.timestamps || [],
                    datasets: [
                      {
                        label: 'Average CPU',
                        data: trendsData?.avgCpu || [],
                        borderColor: 'rgb(59, 130, 246)',
                        tension: 0.4,
                      },
                      {
                        label: 'Peak CPU',
                        data: trendsData?.peakCpu || [],
                        borderColor: 'rgb(239, 68, 68)',
                        tension: 0.4,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      x: { type: 'time' },
                      y: { beginAtZero: true, max: 100 },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage Patterns</CardTitle>
                <CardDescription>Memory consumption trends and peak usage</CardDescription>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: trendsData?.timestamps || [],
                    datasets: [
                      {
                        label: 'Average Memory',
                        data: trendsData?.avgMemory || [],
                        borderColor: 'rgb(16, 185, 129)',
                        tension: 0.4,
                      },
                      {
                        label: 'Peak Memory',
                        data: trendsData?.peakMemory || [],
                        borderColor: 'rgb(245, 158, 11)',
                        tension: 0.4,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      x: { type: 'time' },
                      y: { beginAtZero: true, max: 100 },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Correlation</CardTitle>
                <CardDescription>CPU vs Memory usage correlation analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Scatter
                  data={{
                    datasets: [
                      {
                        label: 'CPU vs Memory',
                        data: performanceData?.correlation || [],
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      x: { title: { display: true, text: 'CPU Usage %' } },
                      y: { title: { display: true, text: 'Memory Usage %' } },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
                <CardDescription>Network latency and response time trends</CardDescription>
              </CardHeader>
              <CardContent>
                <Bar
                  data={{
                    labels: performanceData?.servers || [],
                    datasets: [
                      {
                        label: 'Avg Response Time (ms)',
                        data: performanceData?.responseTime || [],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                      },
                      {
                        label: 'Peak Response Time (ms)',
                        data: performanceData?.peakResponseTime || [],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Maintenance</CardTitle>
                <CardDescription>AI-powered failure prediction and maintenance scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <Line
                  data={predictiveMaintenanceData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Server failure risk analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData?.riskAssessment?.map((server: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div>
                        <div className="font-medium">{server.hostname}</div>
                        <div className="text-sm text-slate-400">{server.riskFactors?.join(', ')}</div>
                      </div>
                      <Badge 
                        variant={server.riskLevel === 'high' ? 'destructive' : 
                                server.riskLevel === 'medium' ? 'secondary' : 'default'}
                      >
                        {server.riskLevel} risk
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center text-slate-400 py-8">
                      <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Risk assessment data will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <CardDescription>Automated report generation and delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" data-testid="schedule-daily-report">
                    <Calendar size={16} className="mr-2" />
                    Daily System Summary
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="schedule-weekly-report">
                    <Calendar size={16} className="mr-2" />
                    Weekly Performance Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="schedule-monthly-report">
                    <Calendar size={16} className="mr-2" />
                    Monthly Compliance Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>Pre-configured report formats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" data-testid="executive-template">
                    <Eye size={16} className="mr-2" />
                    Executive Summary
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="technical-template">
                    <BarChart3 size={16} className="mr-2" />
                    Technical Deep Dive
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="compliance-template">
                    <PieChart size={16} className="mr-2" />
                    Compliance Audit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Download reports in various formats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={handleExportReport} data-testid="export-json">
                    <Download size={16} className="mr-2" />
                    Export as JSON
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="export-pdf">
                    <Download size={16} className="mr-2" />
                    Export as PDF
                  </Button>
                  <Button className="w-full justify-start" variant="outline" data-testid="export-excel">
                    <Download size={16} className="mr-2" />
                    Export as Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}