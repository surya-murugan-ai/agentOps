import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';

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

  // Calculate analytics metrics
  const analyticsData = {
    totalAlerts: alerts?.length || 0,
    criticalAlerts: alerts?.filter((a: any) => a.severity === 'critical').length || 0,
    resolvedAlerts: alerts?.filter((a: any) => a.status === 'resolved').length || 0,
    activeAgents: agents?.filter((a: any) => a.status === 'active').length || 0,
    totalRemediations: remediations?.length || 0,
    executedRemediations: remediations?.filter((r: any) => r.status === 'executed').length || 0,
    avgResponseTime: '2.3 min',
    systemUptime: '99.97%',
    mttr: '4.2 min', // Mean Time To Recovery
    falsePositiveRate: '2.1%'
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
                    {alerts?.filter((a: any) => a.severity === 'warning').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Info Alerts</span>
                  <span className="text-primary font-semibold">
                    {alerts?.filter((a: any) => a.severity === 'info').length || 0}
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
                  <span className="text-white font-semibold">{agents?.length || 0}</span>
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
                <p className="text-3xl font-bold text-success">{metrics?.healthyServers || 0}</p>
                <p className="text-slate-500 text-xs">out of {metrics?.totalServers || 0} total</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Warning Status</p>
                <p className="text-3xl font-bold text-warning">{metrics?.warningServers || 0}</p>
                <p className="text-slate-500 text-xs">servers need attention</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Critical Issues</p>
                <p className="text-3xl font-bold text-error">{metrics?.criticalServers || 0}</p>
                <p className="text-slate-500 text-xs">urgent intervention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}