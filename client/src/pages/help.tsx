import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DollarSign
} from 'lucide-react';

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-dark-bg text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AgentOps Help Center</h1>
          </div>
          <p className="text-slate-400 text-lg">
            Complete guide to using the AI-powered server monitoring and automated remediation platform
          </p>
        </div>

        {/* Quick Status Guide */}
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

        {/* Contact & Support */}
        <Card className="mt-6 bg-dark-surface border-dark-border">
          <CardHeader>
            <CardTitle>Getting Additional Help</CardTitle>
            <CardDescription>Resources and support options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Quick Health Checks</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Visit /api/health for basic system status</li>
                    <li>• Check /api/system/api-status for API health</li>
                    <li>• Monitor agent dashboard for real-time status</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Documentation</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• LOCAL_SETUP_GUIDE.md for installation</li>
                    <li>• QUICK_START.md for getting started</li>
                    <li>• OPTIMIZATION_SUMMARY.md for cost details</li>
                  </ul>
                </div>
              </div>
              
              <Separator className="bg-dark-border" />
              
              <div className="text-center text-sm text-slate-500">
                <p>AgentOps v1.0 - AI-Powered Infrastructure Monitoring Platform</p>
                <p className="mt-1">Built with OpenAI GPT-4o and Claude Sonnet for intelligent automation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}