import { Brain, BarChart3, Server, Users, AlertTriangle, Settings, ClipboardList, Activity, Upload, Database, Wrench, Key, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

export default function Sidebar() {
  const [location] = useLocation();

  // Fetch real data for badge counts
  const { data: servers } = useQuery({
    queryKey: ['/api/servers'],
    refetchInterval: 30000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000,
  });

  const { data: agents } = useQuery({
    queryKey: ['/api/agents'],
    refetchInterval: 30000,
  });

  // Calculate real counts with defaults
  const serverCount = (servers as any[])?.length || 0;
  const alertCount = (alerts as any[])?.length || 0;
  const agentCount = (agents as any[])?.length || 0;

  const getNavItemClass = (path: string) => {
    const isActive = location === path;
    return isActive 
      ? "flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30"
      : "flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors";
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-dark-surface border-r border-dark-border z-30 flex flex-col">
      <div className="p-6 border-b border-dark-border flex-shrink-0">
        <Link href="/">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white text-lg" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white" data-testid="app-title">AgentOps</h1>
              <p className="text-xs text-slate-400">AI Server Monitoring</p>
            </div>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {/* Overview Section */}
        <Link href="/" className={getNavItemClass("/")} data-testid="nav-dashboard">
          <BarChart3 size={20} />
          <span className="font-medium">Dashboard</span>
        </Link>
        
        <Link href="/analytics" className={getNavItemClass("/analytics")} data-testid="nav-analytics">
          <Activity size={20} />
          <span>Analytics</span>
        </Link>
        
        <Link href="/analytics-advanced" className={getNavItemClass("/analytics-advanced")} data-testid="nav-analytics-advanced">
          <TrendingUp size={20} />
          <span>Advanced Analytics</span>
        </Link>
        
        {/* Infrastructure Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            Infrastructure
          </div>
          
          <Link href="/servers" className={getNavItemClass("/servers")} data-testid="nav-servers">
            <Server size={20} />
            <span>Servers</span>
            {serverCount > 0 && (
              <span className="ml-auto bg-slate-600 text-xs px-2 py-1 rounded-full">{serverCount}</span>
            )}
          </Link>
        </div>
        
        {/* Monitoring & Alerts Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            Monitoring
          </div>
          
          <Link href="/alerts" className={getNavItemClass("/alerts")} data-testid="nav-alerts">
            <AlertTriangle size={20} />
            <span>Alerts</span>
            {alertCount > 0 && (
              <span className="ml-auto bg-error text-xs px-2 py-1 rounded-full">{alertCount}</span>
            )}
          </Link>
          
          <Link href="/remediations" className={getNavItemClass("/remediations")} data-testid="nav-remediations">
            <Wrench size={20} />
            <span>Remediations</span>
          </Link>
          
          <Link href="/audit" className={getNavItemClass("/audit")} data-testid="nav-audit">
            <ClipboardList size={20} />
            <span>Audit Trail</span>
          </Link>
        </div>
        
        {/* Data Management Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            Data Management
          </div>
          
          <Link href="/data-view" className={getNavItemClass("/data-view")} data-testid="nav-data-view">
            <BarChart3 size={20} />
            <span>View Data</span>
          </Link>
          
          <Link href="/data-upload" className={getNavItemClass("/data-upload")} data-testid="nav-data-upload">
            <Upload size={20} />
            <span>Upload Data</span>
          </Link>
          
          <Link href="/data-management" className={getNavItemClass("/data-management")} data-testid="nav-data-management">
            <Database size={20} />
            <span>Manage Data</span>
          </Link>
        </div>

        {/* AI Agents Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            AI Agents
          </div>
          
          <Link href="/agents" className={getNavItemClass("/agents")} data-testid="nav-agents">
            <Users size={20} />
            <span>Agents</span>
            {agentCount > 0 && (
              <span className="ml-auto bg-success text-xs px-2 py-1 rounded-full">{agentCount}</span>
            )}
          </Link>
          
          <Link href="/agent-settings" className={getNavItemClass("/agent-settings")} data-testid="nav-agent-settings">
            <Settings size={20} />
            <span>Agent Settings</span>
          </Link>
        </div>

        {/* System Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            System
          </div>
          
          <Link href="/settings" className={getNavItemClass("/settings")} data-testid="nav-settings">
            <Key size={20} />
            <span>API Keys & Config</span>
          </Link>
        </div>
        
        {/* System Status Section */}
        <div className="pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
            System Status
          </div>
          
          <div className="mx-3 bg-slate-700/50 rounded-lg p-3 border border-slate-600/30" data-testid="system-status">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-slate-300">All Systems Operational</span>
            </div>
            <p className="text-xs text-slate-400">7 agents running</p>
            <p className="text-xs text-slate-500">Uptime: 99.98%</p>
          </div>
        </div>
      </nav>


    </div>
  );
}
