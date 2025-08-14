import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';

// Helper functions to calculate real metrics
function calculateMTTR(remediations: any[]): string {
  const resolvedRemediations = remediations.filter(r => r.status === 'executed');
  if (resolvedRemediations.length === 0) return '0 min';
  
  const totalTime = resolvedRemediations.reduce((acc, r) => {
    const created = new Date(r.createdAt).getTime();
    const updated = new Date(r.updatedAt).getTime();
    return acc + (updated - created);
  }, 0);
  
  const avgTimeMs = totalTime / resolvedRemediations.length;
  const avgTimeMin = Math.round(avgTimeMs / (1000 * 60));
  return `${avgTimeMin} min`;
}

function calculateAvgResponseTime(agents: any[]): string {
  const activeAgents = agents.filter(a => a.status === 'active');
  if (activeAgents.length === 0) return '0 min';
  
  // Use a simple calculation based on agent processing metrics
  const avgTime = activeAgents.reduce((acc, agent) => {
    // If agents have processing metrics, use them; otherwise default
    return acc + (agent.avgProcessingTime || 2);
  }, 0) / activeAgents.length;
  
  return `${avgTime.toFixed(1)} min`;
}

function calculateFalsePositiveRate(alerts: any[]): string {
  if (alerts.length === 0) return '0%';
  
  // Count alerts that were resolved without requiring action
  const falsePositives = alerts.filter(a => 
    a.status === 'resolved' && 
    a.description?.toLowerCase().includes('false') || 
    a.description?.toLowerCase().includes('no action')
  ).length;
  
  return `${((falsePositives / alerts.length) * 100).toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 30000,
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  const { data: remediations } = useQuery({
    queryKey: ['/api/remediation-actions'],
    refetchInterval: 30000,
  });

  // Type-safe data with defaults
  const safeMetrics = metrics as any || { totalServers: 0, healthyServers: 0, warningServers: 0, criticalServers: 0 };
  const safeAgents = (agents as any[]) || [];
  const safeAlerts = (alerts as any[]) || [];
  const safeRemediations = (remediations as any[]) || [];

  // Calculate analytics metrics from real data
  const analyticsData = {
    totalAlerts: safeAlerts.length,
    criticalAlerts: safeAlerts.filter((a: any) => a.severity === 'critical').length,
    resolvedAlerts: safeAlerts.filter((a: any) => a.status === 'resolved').length,
    activeAgents: safeAgents.filter((a: any) => a.status === 'active').length,
    totalRemediations: safeRemediations.length,
    executedRemediations: safeRemediations.filter((r: any) => r.status === 'executed').length,
    // Calculate system uptime based on server health
    systemUptime: safeMetrics.totalServers > 0 
      ? (((safeMetrics.healthyServers / safeMetrics.totalServers) * 100).toFixed(2) + '%')
      : '0.00%',
    // Calculate MTTR from remediation data
    mttr: safeRemediations.length > 0 
      ? calculateMTTR(safeRemediations) 
      : '0 min',
    // Calculate average response time from agent data
    avgResponseTime: safeAgents.length > 0 
      ? calculateAvgResponseTime(safeAgents) 
      : '0 min',
    // Calculate false positive rate from resolved alerts
    falsePositiveRate: safeAlerts.length > 0 
      ? calculateFalsePositiveRate(safeAlerts) 
      : '0.0%'
  };

  const alertResolutionRate = analyticsData.totalAlerts > 0 
    ? ((analyticsData.resolvedAlerts / analyticsData.totalAlerts) * 100).toFixed(1) 
    : '0';

  const remediationSuccessRate = analyticsData.totalRemediations > 0 
    ? ((analyticsData.executedRemediations / analyticsData.totalRemediations) * 100).toFixed(1) 
    : '0';

  return (
    <div className="min-h-screen bg-dark-background">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">System Analytics</h1>
          <p className="text-slate-400 mt-1">Performance insights and operational metrics</p>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">System Uptime</p>
                  <p className="text-2xl font-bold text-success">{analyticsData.systemUptime}</p>
                </div>
                <TrendingUp className="text-success" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Alert Resolution Rate</p>
                  <p className="text-2xl font-bold text-primary">{alertResolutionRate}%</p>
                </div>
                <BarChart3 className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Mean Time to Recovery</p>
                  <p className="text-2xl font-bold text-warning">{analyticsData.mttr}</p>
                </div>
                <Activity className="text-warning" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Remediation Success</p>
                  <p className="text-2xl font-bold text-success">{remediationSuccessRate}%</p>
                </div>
                <TrendingUp className="text-success" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <PieChart size={20} />
                <span>Alert Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Critical Alerts</span>
                  <span className="text-error font-semibold">{analyticsData.criticalAlerts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Warning Alerts</span>
                  <span className="text-warning font-semibold">
                    {safeAlerts.filter((a: any) => a.severity === 'warning').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Info Alerts</span>
                  <span className="text-primary font-semibold">
                    {safeAlerts.filter((a: any) => a.severity === 'info').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Resolved</span>
                  <span className="text-success font-semibold">{analyticsData.resolvedAlerts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 size={20} />
                <span>Agent Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Active Agents</span>
                  <span className="text-success font-semibold">{analyticsData.activeAgents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Agents</span>
                  <span className="text-white font-semibold">{safeAgents.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Avg Response Time</span>
                  <span className="text-primary font-semibold">{analyticsData.avgResponseTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">False Positive Rate</span>
                  <span className="text-warning font-semibold">{analyticsData.falsePositiveRate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Health Summary */}
        <Card className="bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Activity size={20} />
              <span>Infrastructure Health Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Healthy Servers</p>
                <p className="text-3xl font-bold text-success">{safeMetrics.healthyServers}</p>
                <p className="text-slate-500 text-xs">out of {safeMetrics.totalServers} total</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Warning Status</p>
                <p className="text-3xl font-bold text-warning">{safeMetrics.warningServers}</p>
                <p className="text-slate-500 text-xs">servers need attention</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Critical Issues</p>
                <p className="text-3xl font-bold text-error">{safeMetrics.criticalServers}</p>
                <p className="text-slate-500 text-xs">urgent intervention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}