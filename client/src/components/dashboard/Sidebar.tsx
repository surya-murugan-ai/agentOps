import { Brain, BarChart3, Server, Users, AlertTriangle, Settings, ClipboardList, Activity } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-dark-surface border-r border-dark-border z-30">
      <div className="p-6 border-b border-dark-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="text-white text-lg" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white" data-testid="app-title">AgentOps</h1>
            <p className="text-xs text-slate-400">AI Server Monitoring</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30"
          data-testid="nav-dashboard"
        >
          <BarChart3 size={20} />
          <span className="font-medium">Dashboard</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-servers"
        >
          <Server size={20} />
          <span>Servers</span>
          <span className="ml-auto bg-slate-600 text-xs px-2 py-1 rounded-full">247</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-agents"
        >
          <Users size={20} />
          <span>Agents</span>
          <span className="ml-auto bg-success text-xs px-2 py-1 rounded-full">7</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-alerts"
        >
          <AlertTriangle size={20} />
          <span>Alerts</span>
          <span className="ml-auto bg-error text-xs px-2 py-1 rounded-full">12</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-remediations"
        >
          <Settings size={20} />
          <span>Remediations</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-audit"
        >
          <ClipboardList size={20} />
          <span>Audit Logs</span>
        </a>
        
        <a 
          href="#" 
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors"
          data-testid="nav-analytics"
        >
          <Activity size={20} />
          <span>Analytics</span>
        </a>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-slate-700/50 rounded-lg p-3" data-testid="system-status">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-300">System Status</span>
          </div>
          <p className="text-xs text-slate-400">All agents operational</p>
          <p className="text-xs text-slate-500">Uptime: 99.98%</p>
        </div>
      </div>
    </div>
  );
}
