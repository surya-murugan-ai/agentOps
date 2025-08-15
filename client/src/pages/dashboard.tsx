import { useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import MetricsOverview from '@/components/dashboard/MetricsOverview';
import AgentStatus from '@/components/dashboard/AgentStatus';
import SystemMetrics from '@/components/dashboard/SystemMetrics';
import ActiveAlerts from '@/components/dashboard/ActiveAlerts';
import RemediationActions from '@/components/dashboard/RemediationActions';
import AuditLog from '@/components/dashboard/AuditLog';
import { useWebSocket } from '@/hooks/useWebSocket';
import { APICreditsNotification } from '@/components/notifications/APICreditsNotification';

export default function Dashboard() {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    document.title = "AgentOps - AI Server Monitoring Platform";
  }, []);

  return (
    <div className="bg-dark-bg text-slate-50 font-inter min-h-screen">
      <Sidebar />
      
      <div className="ml-64 min-h-screen">
        <TopBar isConnected={isConnected} />
        
        <main className="p-6 space-y-6" data-testid="dashboard-main">
          <MetricsOverview />
          <AgentStatus />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <SystemMetrics />
            </div>
            <div>
              <ActiveAlerts />
            </div>
          </div>
          
          <RemediationActions />
          <AuditLog />
        </main>
      </div>
      
      {/* API Credits Notification */}
      <APICreditsNotification />
    </div>
  );
}
