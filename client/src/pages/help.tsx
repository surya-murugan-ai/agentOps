import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  Activity, 
  Bot, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Settings, 
  Database,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Book,
  FileText,
  ChevronRight,
  Home,
  Upload,
  BarChart3,
  Monitor
} from 'lucide-react';

export default function HelpCenter() {
  const [activeSection, setActiveSection] = useState('overview');

  const navigationSections = [
    { id: 'overview', title: 'Overview', icon: Home },
    { id: 'quick-start', title: 'Quick Start Guide', icon: Zap },
    { id: 'data-upload', title: 'Data Upload', icon: Upload },
    { id: 'dashboard', title: 'Dashboard Navigation', icon: Monitor },
    { id: 'agents', title: 'Agent Management', icon: Bot },
    { id: 'alerts', title: 'Alerts & Remediation', icon: AlertTriangle },
    { id: 'analytics', title: 'Analytics & Reports', icon: BarChart3 },
    { id: 'thresholds', title: 'Threshold Management', icon: Settings },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: Shield },
    { id: 'api-reference', title: 'API Reference', icon: FileText }
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-dark-surface border-r border-dark-border h-screen sticky top-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Help Center</h1>
            </div>
            
            <ScrollArea className="h-[calc(100vh-120px)]">
              <nav className="space-y-2">
                {navigationSections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'hover:bg-dark-bg text-slate-300 hover:text-white'
                      }`}
                      data-testid={`nav-${section.id}`}
                    >
                      <IconComponent size={16} />
                      <span className="text-sm">{section.title}</span>
                      <ChevronRight size={14} className="ml-auto opacity-50" />
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8" id="overview">
              <div className="flex items-center gap-3 mb-4">
                <Book className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">AgentOps Documentation</h1>
              </div>
              <p className="text-slate-400 text-lg">
                Complete guide to using the AI-powered server monitoring and automated remediation platform
              </p>
            </div>

        {/* Quick Start Guide */}
        <section id="quick-start" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Quick Start Guide</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Upload Your Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-3">Start by uploading your server data to begin monitoring</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => scrollToSection('data-upload')}
                  className="w-full"
                  data-testid="quick-start-data-upload"
                >
                  View Upload Guide <ChevronRight size={14} className="ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Configure Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-3">Set up AI agents to monitor your infrastructure</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => scrollToSection('agents')}
                  className="w-full"
                  data-testid="quick-start-agents"
                >
                  Agent Setup <ChevronRight size={14} className="ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Monitor & Analyze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-3">Use dashboards and analytics to track performance</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => scrollToSection('dashboard')}
                  className="w-full"
                  data-testid="quick-start-dashboard"
                >
                  Dashboard Guide <ChevronRight size={14} className="ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* System Status Understanding */}
        <Card className="mb-8 bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Understanding System Status
            </CardTitle>
            <CardDescription>Learn what the different indicators mean</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>9/7 Active Agents:</strong> This shows 9 total agents with 7 currently monitoring. 
                This is normal when agents pause due to optimization or circuit breakers.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-400">Healthy Status Indicators</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Green dots = Systems running normally</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Checkmarks = Successful operations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-900 text-green-300">Active</Badge>
                    <span>Agent is monitoring and processing</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-400">Warning Status Indicators</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Yellow dots = Performance concerns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Clock icon = Optimization delays</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-900 text-yellow-300">Paused</Badge>
                    <span>Agent temporarily stopped to save costs</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* AI Agents Guide */}
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                AI Agents Overview
              </CardTitle>
              <CardDescription>Understanding the 9 specialized AI agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border-l-2 border-blue-500 pl-3">
                  <h4 className="font-medium text-blue-400">Telemetry Collector</h4>
                  <p className="text-sm text-slate-400">Gathers server metrics every 30 seconds</p>
                </div>
                
                <div className="border-l-2 border-orange-500 pl-3">
                  <h4 className="font-medium text-orange-400">Anomaly Detector</h4>
                  <p className="text-sm text-slate-400">Uses AI to identify unusual server behavior</p>
                  <p className="text-xs text-slate-500">May pause when alert limit reached (8/8)</p>
                </div>
                
                <div className="border-l-2 border-purple-500 pl-3">
                  <h4 className="font-medium text-purple-400">Predictive Analytics</h4>
                  <p className="text-sm text-slate-400">Forecasts potential infrastructure issues</p>
                  <p className="text-xs text-slate-500">Skips analysis when recent predictions exist</p>
                </div>
                
                <div className="border-l-2 border-green-500 pl-3">
                  <h4 className="font-medium text-green-400">Recommendation Engine</h4>
                  <p className="text-sm text-slate-400">Suggests automated remediation actions</p>
                </div>
                
                <div className="border-l-2 border-red-500 pl-3">
                  <h4 className="font-medium text-red-400">Approval & Compliance</h4>
                  <p className="text-sm text-slate-400">Manages workflow approvals for sensitive operations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Optimization Guide */}
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                API Cost Optimization
              </CardTitle>
              <CardDescription>How the system saves on AI API costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  System automatically reduces API usage by 85-90% through intelligent optimization
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="bg-dark-bg p-3 rounded-lg">
                  <h4 className="font-medium text-green-400 mb-2">Smart Features</h4>
                  <ul className="text-sm space-y-1 text-slate-400">
                    <li>• Change detection - Only analyzes when data changes</li>
                    <li>• Cooldown periods - Prevents excessive API calls</li>
                    <li>• Context caching - Reuses data for 5 minutes</li>
                    <li>• Circuit breakers - Stops agents when limits reached</li>
                  </ul>
                </div>
                
                <div className="bg-dark-bg p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-400 mb-2">Log Messages You'll See</h4>
                  <ul className="text-xs space-y-1 text-slate-500 font-mono">
                    <li>"Recent predictions exist, skipping AI analysis to save API costs"</li>
                    <li>"Metrics stable, skipping expensive AI analysis"</li>
                    <li>"CIRCUIT BREAKER ACTIVATED - Global alert limit reached"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Navigation */}
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Dashboard Navigation
              </CardTitle>
              <CardDescription>Key sections and their purposes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Activity className="h-4 w-4 text-blue-400 mt-1" />
                  <div>
                    <h4 className="font-medium">Operations Dashboard</h4>
                    <p className="text-sm text-slate-400">Main overview with real-time metrics</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Bot className="h-4 w-4 text-purple-400 mt-1" />
                  <div>
                    <h4 className="font-medium">Agent Control</h4>
                    <p className="text-sm text-slate-400">Manage AI agents and monitoring settings</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-green-400 mt-1" />
                  <div>
                    <h4 className="font-medium">Advanced Analytics</h4>
                    <p className="text-sm text-slate-400">Detailed reports and trend analysis</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-red-400 mt-1" />
                  <div>
                    <h4 className="font-medium">Alerts & Actions</h4>
                    <p className="text-sm text-slate-400">View alerts and remediation history</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting Guide */}
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Common Issues & Solutions
              </CardTitle>
              <CardDescription>Quick fixes for common problems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border border-orange-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-orange-400 mb-2">API Quota Exceeded</h4>
                  <p className="text-sm text-slate-400 mb-2">System shows "quota_exceeded" status</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• This is normal - optimization will reduce usage</li>
                    <li>• Agents will automatically pause expensive operations</li>
                    <li>• System continues monitoring with fallback methods</li>
                  </ul>
                </div>
                
                <div className="border border-yellow-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-400 mb-2">9/7 Agent Ratio</h4>
                  <p className="text-sm text-slate-400 mb-2">More total agents than active monitoring</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Normal when optimization features are working</li>
                    <li>• 2 agents paused to save API costs</li>
                    <li>• Circuit breakers preventing excessive alerts</li>
                  </ul>
                </div>
                
                <div className="border border-red-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-red-400 mb-2">Missing Data</h4>
                  <p className="text-sm text-slate-400 mb-2">Charts showing empty or minimal data</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Check if agents are collecting telemetry</li>
                    <li>• Verify database connectivity</li>
                    <li>• Wait for next collection cycle (30 seconds)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Status Guide */}
        <Card className="mt-6 bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              API Status & Health Monitoring
            </CardTitle>
            <CardDescription>Understanding system health indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-green-400">Healthy System</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>OpenAI: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>All agents running</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time monitoring enabled</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-yellow-400">Optimized System</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Some agents paused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Circuit breakers active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>API usage reduced</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-red-400">Issues Detected</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>API quota exceeded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Database connectivity issues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Agent errors</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Upload Guide */}
        <section id="data-upload" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Data Upload Guide</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>Step-by-Step Upload Process</CardTitle>
                <CardDescription>How to upload server data and metrics to start monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-blue-400 mb-2">Step 1: Prepare Your Data</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Supported formats: CSV, Excel (.xlsx), JSON</li>
                      <li>• Include server hostnames (srv-001, server1, etc.)</li>
                      <li>• Add metrics: CPU, memory, disk usage</li>
                      <li>• Optional: Environment, location, tags</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">Step 2: Upload Process</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Go to Data Management → Upload Data</li>
                      <li>• Drag and drop or select your file</li>
                      <li>• Review the automatic data mapping</li>
                      <li>• Click "Process Upload" to start</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-purple-400 mb-2">Step 3: Verification</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Check upload progress in real-time</li>
                      <li>• View processed records count</li>
                      <li>• Verify data in Data Viewer</li>
                      <li>• Monitor dashboard for new metrics</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

        </section>

        {/* Dashboard Navigation Guide */}
        <section id="dashboard" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">Dashboard Navigation</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>Platform Interface Guide</CardTitle>
                <CardDescription>Master the dashboard and navigate all platform features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">Main Dashboard</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Live server health overview</li>
                      <li>• Real-time metrics and alerts</li>
                      <li>• Agent status monitoring</li>
                      <li>• Quick action buttons</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-blue-400 mb-2">Advanced Analytics</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Historical trend analysis</li>
                      <li>• Custom time range filtering</li>
                      <li>• Environment and severity filters</li>
                      <li>• Export reports and charts</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-orange-400 mb-2">Alert Management</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• View and acknowledge alerts</li>
                      <li>• Filter by severity and status</li>
                      <li>• Track remediation actions</li>
                      <li>• Review audit logs</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

        </section>

        {/* Agent Management Guide */}
        <section id="agents" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Bot className="h-6 w-6 text-purple-500" />
            <h2 className="text-2xl font-bold">Agent Management</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>AI Agent Control & Monitoring</CardTitle>
                <CardDescription>Control, configure, and troubleshoot the 9 specialized AI agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-purple-400 mb-2">Agent Control Panel</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Start/stop individual agents</li>
                      <li>• Monitor processing cycles</li>
                      <li>• View agent performance metrics</li>
                      <li>• Configure processing intervals</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-400 mb-2">Understanding Agent Status</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Active: Currently processing data</li>
                      <li>• Paused: Temporarily stopped (optimization)</li>
                      <li>• Error: Needs attention or restart</li>
                      <li>• Idle: Waiting for next cycle</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">Troubleshooting Agents</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Check API key configuration</li>
                      <li>• Review processing logs</li>
                      <li>• Restart failed agents</li>
                      <li>• Adjust processing intervals</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

        </section>

        {/* Alert and Remediation Guide */}
        <section id="alerts" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h2 className="text-2xl font-bold">Alerts & Remediation</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>Incident Management Workflow</CardTitle>
                <CardDescription>Handle alerts, approve remediations, and track resolutions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">Alert Lifecycle</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• New: Just detected by AI agents</li>
                      <li>• Acknowledged: Viewed by operator</li>
                      <li>• Resolved: Issue fixed automatically/manually</li>
                      <li>• Closed: No longer relevant</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-orange-400 mb-2">Remediation Actions</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Pending: Waiting for approval</li>
                      <li>• Approved: Ready for execution</li>
                      <li>• Completed: Successfully executed</li>
                      <li>• Failed: Execution encountered errors</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">Best Practices</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Review alerts within 15 minutes</li>
                      <li>• Approve low-risk remediations quickly</li>
                      <li>• Monitor execution results</li>
                      <li>• Learn from audit logs</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

        </section>

        {/* Analytics and Reporting Guide */}
        <section id="analytics" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>Advanced Analytics & Insights</CardTitle>
                <CardDescription>Use filters, generate reports, and export data for analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-blue-400 mb-2">Using Filters</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Time Range: 1h, 24h, 7d, 30d, 90d</li>
                      <li>• Environment: Production, Staging, Dev</li>
                      <li>• Status: Healthy, Warning, Critical</li>
                      <li>• Servers: Multi-select specific servers</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-green-400 mb-2">Chart Types</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Line charts: CPU, memory trends over time</li>
                      <li>• Bar charts: Alert distribution by severity</li>
                      <li>• Scatter plots: Performance correlations</li>
                      <li>• Pie charts: Server status breakdown</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-purple-400 mb-2">Exporting Data</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Export charts as PNG/SVG images</li>
                      <li>• Download raw data as CSV/JSON</li>
                      <li>• Generate executive summary reports</li>
                      <li>• Schedule automated reports</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

        </section>

        {/* Threshold Management Guide */}
        <section id="thresholds" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Threshold Management</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle>Environment-Specific Configuration</CardTitle>
                <CardDescription>Set up monitoring thresholds for different environments and metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-400 mb-2">Environment-Specific</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Production: Strict thresholds (80% CPU)</li>
                      <li>• Staging: Moderate thresholds (85% CPU)</li>
                      <li>• Development: Relaxed thresholds (90% CPU)</li>
                      <li>• Custom: Define your own thresholds</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-orange-400 mb-2">Metric Types</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• CPU Usage: Warning and critical levels</li>
                      <li>• Memory Usage: Available RAM thresholds</li>
                      <li>• Disk Space: Free space percentages</li>
                      <li>• Network Latency: Response time limits</li>
                    </ul>
                  </div>
                  
                  <div className="bg-dark-bg p-3 rounded-lg">
                    <h4 className="font-medium text-red-400 mb-2">Alert Configuration</h4>
                    <ul className="text-sm space-y-1 text-slate-400">
                      <li>• Set warning and critical thresholds</li>
                      <li>• Configure alert frequency limits</li>
                      <li>• Enable/disable notifications</li>
                      <li>• Test threshold settings</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
        </section>

        {/* Troubleshooting Guide */}
        <section id="troubleshooting" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold">Troubleshooting</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-orange-400">Common Issues</CardTitle>
                <CardDescription>Quick fixes for frequent problems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-orange-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-orange-400 mb-2">API Quota Exceeded</h4>
                  <p className="text-sm text-slate-400 mb-2">System shows "quota_exceeded" status</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Normal behavior - optimization will reduce usage</li>
                    <li>• Agents automatically pause expensive operations</li>
                    <li>• System continues monitoring with fallback methods</li>
                  </ul>
                </div>
                
                <div className="border border-yellow-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-yellow-400 mb-2">9/7 Agent Ratio</h4>
                  <p className="text-sm text-slate-400 mb-2">More total agents than active monitoring</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Normal when optimization features are working</li>
                    <li>• 2 agents paused to save API costs</li>
                    <li>• Circuit breakers preventing excessive alerts</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-dark-surface border-dark-border">
              <CardHeader>
                <CardTitle className="text-red-400">Error Resolution</CardTitle>
                <CardDescription>Steps to resolve system errors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-red-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-red-400 mb-2">Missing Data</h4>
                  <p className="text-sm text-slate-400 mb-2">Charts showing empty or minimal data</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Check if agents are collecting telemetry</li>
                    <li>• Verify database connectivity</li>
                    <li>• Wait for next collection cycle (30 seconds)</li>
                  </ul>
                </div>
                
                <div className="border border-blue-500/20 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-400 mb-2">Upload Issues</h4>
                  <p className="text-sm text-slate-400 mb-2">File upload failures or errors</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Check file format (CSV, Excel, JSON)</li>
                    <li>• Ensure proper column headers</li>
                    <li>• Verify file size limits (10MB max)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* API Reference */}
        <section id="api-reference" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-purple-500" />
            <h2 className="text-2xl font-bold">API Reference</h2>
          </div>
          
          <Card className="bg-dark-surface border-dark-border">
            <CardHeader>
              <CardTitle>Health Check Endpoints</CardTitle>
              <CardDescription>Monitor system health and API status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-dark-bg p-4 rounded-lg font-mono text-sm">
                  <div className="text-green-400 mb-2">GET /api/health</div>
                  <p className="text-slate-400 text-xs mb-2">Basic system status check</p>
                  <div className="text-slate-500 text-xs">
                    Returns: {`{ status: 'ok', timestamp: '...' }`}
                  </div>
                </div>
                
                <div className="bg-dark-bg p-4 rounded-lg font-mono text-sm">
                  <div className="text-blue-400 mb-2">GET /api/system/api-status</div>
                  <p className="text-slate-400 text-xs mb-2">Detailed API health information</p>
                  <div className="text-slate-500 text-xs">
                    Returns: OpenAI status, rate limits, errors
                  </div>
                </div>
                
                <div className="bg-dark-bg p-4 rounded-lg font-mono text-sm">
                  <div className="text-purple-400 mb-2">GET /api/agents</div>
                  <p className="text-slate-400 text-xs mb-2">List all AI agents and their status</p>
                  <div className="text-slate-500 text-xs">
                    Returns: Agent list with activity status
                  </div>
                </div>
                
                <div className="bg-dark-bg p-4 rounded-lg font-mono text-sm">
                  <div className="text-yellow-400 mb-2">GET /api/dashboard/metrics</div>
                  <p className="text-slate-400 text-xs mb-2">Dashboard summary metrics</p>
                  <div className="text-slate-500 text-xs">
                    Returns: Server counts, health status
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Getting Help */}
        <Card className="bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              Getting Additional Help
            </CardTitle>
            <CardDescription>Resources and support options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-400">Quick Health Checks</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <code className="text-green-400">/api/health</code>
                      <span className="text-slate-400">- Basic system status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <code className="text-blue-400">/api/system/api-status</code>
                      <span className="text-slate-400">- API health</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-500" />
                      <span className="text-slate-400">Agent Control Dashboard - Real-time monitoring</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-green-400">Documentation Files</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <code className="text-blue-400">LOCAL_SETUP_GUIDE.md</code>
                      <span className="text-slate-400">- Installation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <code className="text-green-400">QUICK_START.md</code>
                      <span className="text-slate-400">- Getting started</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-yellow-500" />
                      <code className="text-yellow-400">OPTIMIZATION_SUMMARY.md</code>
                      <span className="text-slate-400">- Cost details</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="bg-dark-border" />
              
              <div className="text-center">
                <div className="text-sm text-slate-500 mb-2">
                  <strong className="text-white">AgentOps v1.0</strong> - AI-Powered Infrastructure Monitoring Platform
                </div>
                <div className="text-xs text-slate-600">
                  Built with OpenAI GPT-4o and Claude Sonnet for intelligent automation
                </div>
                <div className="mt-4 flex justify-center gap-4">
                  <Badge variant="secondary" className="bg-green-900 text-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Production Ready
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                    <Zap className="h-3 w-3 mr-1" />
                    Cost Optimized
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-900 text-purple-300">
                    <Bot className="h-3 w-3 mr-1" />
                    AI Powered
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}