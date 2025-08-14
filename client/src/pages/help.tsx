import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Search, 
  Play, 
  Settings, 
  Shield, 
  BarChart3, 
  Users, 
  FileText, 
  GitBranch,
  Server,
  Bot,
  AlertTriangle,
  Wrench,
  History,
  Database,
  ChevronDown,
  ChevronRight,
  Home,
  HelpCircle,
  MessageSquare,
  Download,
  ExternalLink
} from "lucide-react";
import { useLocation, Link } from "wouter";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [openSections, setOpenSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Play,
      description: 'Learn the basics of AgentOps platform',
      content: [
        {
          title: 'Platform Overview',
          content: `AgentOps is an AI-powered server health monitoring and automated remediation platform designed for financial institutions. The platform features 8 specialized AI agents that continuously monitor your servers, detect anomalies, predict issues, and automatically remediate problems.`
        },
        {
          title: 'First Steps',
          content: `1. **Dashboard**: Start at the main dashboard to get an overview of your system health
2. **Servers**: Add your servers to begin monitoring
3. **Agents**: Configure and activate AI agents for automated monitoring
4. **Data Upload**: Import existing infrastructure data for immediate insights
5. **Workflows**: Set up approval processes for automated actions`
        },
        {
          title: 'Key Benefits',
          content: `• **Proactive Monitoring**: Detect issues before they impact operations
• **Automated Remediation**: Fix problems automatically with AI-driven solutions
• **Compliance Ready**: Built-in audit trails and approval workflows
• **Real-time Insights**: Live dashboards and alert notifications
• **Predictive Analytics**: Forecast potential issues and capacity needs`
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: BarChart3,
      description: 'Understanding your main control center',
      content: [
        {
          title: 'Dashboard Overview',
          content: `The dashboard provides a real-time view of your entire infrastructure health. It displays key metrics, active alerts, agent status, and recent activities in an easy-to-understand format.`
        },
        {
          title: 'Key Metrics Cards',
          content: `• **Active Servers**: Total number of monitored servers
• **Current Alerts**: Number of active alerts by severity
• **Agent Status**: Health status of all AI agents
• **Recent Actions**: Latest automated remediation activities`
        },
        {
          title: 'System Performance',
          content: `Monitor overall system performance with:
• **CPU Usage**: Average CPU utilization across all servers
• **Memory Usage**: Memory consumption trends
• **Network Traffic**: Data transfer rates and patterns
• **Disk Usage**: Storage utilization and capacity planning`
        },
        {
          title: 'Real-time Updates',
          content: `The dashboard automatically refreshes every 30 seconds to show the latest data. Watch for:
• Color-coded status indicators (green = healthy, yellow = warning, red = critical)
• Live charts showing performance trends
• Instant alert notifications
• Agent activity indicators`
        }
      ]
    },
    {
      id: 'servers',
      title: 'Server Management',
      icon: Server,
      description: 'Managing your server inventory',
      content: [
        {
          title: 'Adding Servers',
          content: `To add a new server to monitoring:
1. Navigate to **Servers** page
2. Click **Add Server** button
3. Enter server details:
   - Hostname
   - IP Address
   - Operating System
   - Environment (Production/Staging/Development)
   - Tags for organization
4. Click **Save** to begin monitoring`
        },
        {
          title: 'Server Status',
          content: `Each server displays status information:
• **Online/Offline**: Current connectivity status
• **Health Score**: Overall health rating (0-100)
• **Last Seen**: When the server was last contacted
• **Alert Count**: Number of active alerts for this server
• **Performance Metrics**: Current CPU, memory, and disk usage`
        },
        {
          title: 'Bulk Operations',
          content: `Perform actions on multiple servers:
• **Bulk Edit**: Update tags or properties for multiple servers
• **Health Check**: Force immediate health checks
• **Alert Silence**: Temporarily disable alerts for maintenance
• **Export Data**: Download server information and metrics`
        }
      ]
    },
    {
      id: 'agents',
      title: 'AI Agents',
      icon: Bot,
      description: 'Understanding and configuring AI agents',
      content: [
        {
          title: 'Agent Overview',
          content: `AgentOps includes 8 specialized AI agents:
1. **Telemetry Collector**: Gathers server metrics every 30 seconds
2. **Anomaly Detector**: Identifies unusual patterns in server behavior
3. **Predictive Analytics**: Forecasts potential issues using historical data
4. **Recommendation Engine**: Suggests remediation actions for detected issues
5. **Approval & Compliance**: Manages approval workflows for sensitive operations
6. **Remediation Executor**: Executes approved automated fixes
7. **Audit & Reporting**: Maintains compliance logs and generates reports
8. **Data Agent**: Provides data cleaning and quality validation`
        },
        {
          title: 'Agent Configuration',
          content: `Configure each agent individually:
• **Execution Interval**: How often the agent runs (default: 2 minutes)
• **Confidence Threshold**: Minimum confidence level for actions (0-100)
• **Auto-execution**: Enable/disable automatic remediation
• **Alert Thresholds**: Set custom thresholds for different metrics
• **Approval Requirements**: Configure which actions require manual approval`
        },
        {
          title: 'Agent Status Monitoring',
          content: `Monitor agent health and performance:
• **Status Indicators**: Green (active), Yellow (warning), Red (error)
• **Last Execution**: When the agent last ran successfully
• **Success Rate**: Percentage of successful executions
• **Performance Metrics**: Execution time and resource usage
• **Error Logs**: Detailed error information for troubleshooting`
        },
        {
          title: 'How AI Agents Work Together',
          content: `The 8 AI agents work in a coordinated workflow to monitor and remediate issues:

**1. Telemetry Collector** (Every 30 seconds)
• Gathers real-time metrics: CPU, memory, disk, network
• Stores data in time-series database
• Triggers alerts when thresholds are exceeded

**2. Anomaly Detector** (Every 2 minutes)
• Analyzes collected metrics using AI pattern recognition
• Identifies unusual behavior that may not trigger standard alerts
• Creates anomaly records for investigation

**3. Predictive Analytics** (Every 2 minutes)
• Uses historical data and machine learning models
• Forecasts potential issues 1-24 hours in advance
• Generates predictive alerts for proactive action

**4. Recommendation Engine** (Every 2 minutes)
• Processes alerts from other agents
• Uses OpenAI GPT-4o to generate specific remediation actions
• Creates detailed action plans with commands and confidence scores

**5. Approval & Compliance** (Real-time)
• Routes high-risk actions through approval workflows
• Ensures compliance with organizational policies
• Logs all decisions for audit purposes

**6. Remediation Executor** (Real-time)
• Executes approved actions on target servers
• Monitors execution progress and results
• Reports success/failure back to the system

**Example Workflow:**
Telemetry Collector detects 85% memory usage → Anomaly Detector confirms unusual pattern → Recommendation Engine suggests cache clearing → Approval system routes to manager → Remediation Executor runs command → Audit logs the action`
        }
      ]
    },
    {
      id: 'alerts',
      title: 'Alert Management',
      icon: AlertTriangle,
      description: 'Managing alerts and notifications',
      content: [
        {
          title: 'Alert Types',
          content: `AgentOps monitors for various alert types:
• **CPU Alerts**: High CPU usage, overload conditions
• **Memory Alerts**: Memory leaks, out of memory conditions
• **Disk Alerts**: Low disk space, I/O bottlenecks
• **Network Alerts**: Connectivity issues, high latency
• **Service Alerts**: Application failures, service downtime
• **Security Alerts**: Unusual access patterns, security threats`
        },
        {
          title: 'Alert Severity Levels',
          content: `Alerts are classified by severity:
• **Critical**: Immediate action required, service impact
• **High**: Urgent attention needed, potential service impact
• **Medium**: Important issue, monitor closely
• **Low**: Informational, no immediate action required`
        },
        {
          title: 'Alert Actions',
          content: `Available actions for each alert:
• **Acknowledge**: Mark alert as seen and being handled
• **Resolve**: Mark alert as fixed
• **Silence**: Temporarily disable alert notifications
• **Escalate**: Promote to higher severity level
• **Add Comment**: Document investigation notes
• **View Details**: See full alert information and context`
        },
        {
          title: 'Notification Channels',
          content: `Configure alert notifications:
• **Email**: Send alerts to email addresses
• **Slack**: Post alerts to Slack channels
• **Webhook**: Send alerts to custom endpoints
• **SMS**: Send critical alerts via text message
• **Dashboard**: Real-time alerts in the web interface`
        },
        {
          title: 'From Alert to Action - Complete Process',
          content: `See how alerts trigger automated remediation actions:

**Step 1: Alert Detection**
• Telemetry Collector monitors server metrics every 30 seconds
• When CPU > 80%, Memory > 75%, or Disk > 90%, alert is created
• Alert includes: hostname, metric type, current value, threshold exceeded

**Step 2: AI Analysis** 
• Recommendation Engine processes the alert within 2 minutes
• AI analyzes server history, environment, and current state
• System determines root cause and evaluates solution options

**Step 3: Solution Generation**
• AI generates specific remediation commands based on issue type:
  - **High Memory**: \`sync && echo 3 > /proc/sys/vm/drop_caches\`
  - **Stuck Service**: \`systemctl restart [service-name]\`
  - **Full Disk**: \`find /tmp -type f -atime +7 -delete\`
  - **High CPU**: \`renice -n 10 -p [process-id]\`

**Step 4: Risk Assessment**
• System calculates risk score (0-100) based on:
  - Command safety level
  - Server criticality (production vs development)
  - Potential downtime duration
  - Historical success rate

**Step 5: Approval Routing**
• Low risk (0-30): Auto-approved and executed
• Medium risk (31-70): Single approval required
• High risk (71-100): Dual approval required
• Creates remediation card with all details for approval

**Step 6: Execution & Monitoring**
• Once approved, Remediation Executor runs the command
• Real-time monitoring of execution progress
• Success/failure results logged in audit trail
• Follow-up monitoring to verify issue resolution

This entire process typically takes 2-5 minutes from alert detection to problem resolution.`
        }
      ]
    },
    {
      id: 'remediation',
      title: 'Automated Remediation',
      icon: Wrench,
      description: 'Understanding automated problem resolution',
      content: [
        {
          title: 'Remediation Types',
          content: `Common automated remediation actions:
• **Restart Service**: Restart failed or hung services
• **Clear Cache**: Clear application and system caches
• **Scale Resources**: Increase CPU, memory, or storage
• **Update Configuration**: Apply configuration fixes
• **Restart Server**: Full server restart for critical issues
• **Disk Cleanup**: Remove temporary files and logs`
        },
        {
          title: 'How Commands Are Generated',
          content: `The AI system uses a sophisticated process to generate remediation commands:

**1. Alert Analysis**
When an alert is triggered (like high memory usage), the Recommendation Engine AI agent analyzes:
• Current server metrics and thresholds
• Historical patterns and trends
• Server environment and criticality
• Previous successful remediation actions

**2. AI Processing**
The system uses OpenAI GPT-4o to:
• Understand the root cause of the issue
• Consider multiple possible solutions
• Evaluate the safety and effectiveness of each option
• Generate specific commands tailored to the problem

**3. Command Selection**
For each issue type, the AI knows proven solutions:
• **Memory Issues**: \`sync && echo 3 > /proc/sys/vm/drop_caches\` (clear caches)
• **Service Problems**: \`systemctl restart [service-name]\` (restart services)
• **Disk Space**: \`find /tmp -type f -atime +7 -delete\` (cleanup old files)
• **High CPU**: \`renice -n 10 -p [process-id]\` (reduce process priority)

**4. Confidence Scoring**
Each recommendation includes a confidence score (0-100%) based on:
• Success rate of this solution for similar issues
• Relevance to current server metrics
• Risk assessment and potential side effects
• Historical effectiveness on this specific server

**Example Process:**
Server host-002 shows 85% memory usage → Alert triggered → AI analyzes pattern → Recommends cache clearing with 80% confidence → Command generated: \`sync && echo 3 > /proc/sys/vm/drop_caches\` → Routed to approval workflow`
        },
        {
          title: 'Approval Process',
          content: `Remediation actions follow approval workflows:
1. **Risk Assessment**: AI calculates risk score (0-100)
2. **Approval Routing**: High-risk actions require approval
3. **Manual Review**: Approvers review action details
4. **Execution**: Approved actions are executed automatically
5. **Verification**: System verifies action success
6. **Reporting**: Results logged for audit purposes`
        },
        {
          title: 'Risk Levels',
          content: `Actions are categorized by risk:
• **Low Risk (0-30)**: Safe actions, auto-approved
• **Medium Risk (31-70)**: Require single approval
• **High Risk (71-100)**: Require dual approval
• **Critical Risk**: Manual execution only`
        },
        {
          title: 'Understanding Remediation Cards',
          content: `When viewing remediation actions, each card provides complete information:

**Card Header:**
• **Action Title**: Clear description of what will be done (e.g., "Clear System Cache and Buffers")
• **Server**: Target server hostname (e.g., "host-002")
• **Action Type**: Category of remediation (optimize_memory, restart_service, etc.)
• **Status Badge**: Current state (pending, approved, executing, completed)

**Problem Description:**
• **Issue Details**: What problem was detected and why action is needed
• **AI Reasoning**: How the AI determined this solution would help
• **Impact Assessment**: What improvement to expect after remediation

**Technical Information:**
• **Confidence Score**: AI's confidence in solution effectiveness (0-100%)
• **Estimated Downtime**: How long the action will take to complete
• **Approval Required**: Whether manual approval is needed before execution

**Command Details:**
• **Exact Command**: The specific command that will be executed
• **Command Explanation**: What each part of the command does
• **Safety Information**: Why this command is safe to run

**Action Buttons:**
• **Approve**: Authorize the action to proceed (if you have permission)
• **Reject**: Decline the action with optional reason
• **View Details**: See complete technical information and logs

**Example Card Interpretation:**
"Clear System Cache and Buffers" on host-002 with 80% confidence means the AI detected high memory usage and wants to run 'sync && echo 3 > /proc/sys/vm/drop_caches' to free up cached memory, which should take about 5 seconds and requires approval.`
        }
      ]
    },
    {
      id: 'workflows',
      title: 'Workflow Management',
      icon: GitBranch,
      description: 'Setting up approval workflows',
      content: [
        {
          title: 'Workflow Overview',
          content: `Workflows ensure proper approval for automated actions. They provide governance, compliance, and safety controls for all remediation activities.`
        },
        {
          title: 'Workflow Sections',
          content: `• **Overview**: Dashboard of all workflow activities
• **Pending Approvals**: Actions awaiting approval
• **Approved**: Completed approvals
• **Rejected**: Denied actions
• **History**: Complete workflow audit trail
• **Templates**: Pre-configured workflow patterns
• **User Management**: Role and permission management
• **Settings**: Approval rules and configuration`
        },
        {
          title: 'Approval Rules',
          content: `Configure approval requirements:
• **Auto-approval**: Enable for low-risk actions
• **Single Approval**: Medium-risk actions
• **Dual Approval**: High-risk actions
• **Risk Thresholds**: Customize risk level boundaries
• **Time Limits**: Set approval timeouts
• **Escalation**: Auto-escalate expired approvals`
        },
        {
          title: 'User Roles',
          content: `Standard user roles:
• **Administrator**: Full system access and configuration
• **Approver**: Can approve workflow actions
• **Operator**: Can view and acknowledge alerts
• **Viewer**: Read-only access to dashboards and reports`
        }
      ]
    },
    {
      id: 'data-management',
      title: 'Data Management',
      icon: Database,
      description: 'Managing your infrastructure data',
      content: [
        {
          title: 'Data Upload',
          content: `Import existing infrastructure data:
1. Navigate to **Data Upload** page
2. Choose file format (CSV, Excel, JSON)
3. Select data type (Servers, Metrics, Alerts, etc.)
4. Upload file and review detected structure
5. Map columns to system fields
6. Validate and import data`
        },
        {
          title: 'Supported Data Types',
          content: `Import various data types:
• **Server Inventory**: Hostname, IP, OS, specifications
• **Historical Metrics**: CPU, memory, disk, network data
• **Alert History**: Past alerts and resolutions
• **Remediation Actions**: Previous automated actions
• **Audit Logs**: Historical audit and compliance data`
        },
        {
          title: 'Data Quality',
          content: `The Data Agent ensures data quality:
• **Duplicate Detection**: Identifies and removes duplicates
• **Missing Value Handling**: Fills gaps with appropriate defaults
• **Outlier Detection**: Identifies and corrects anomalous values
• **Data Validation**: Ensures data meets format requirements
• **Quality Scoring**: Provides data quality metrics`
        },
        {
          title: 'Data Export',
          content: `Export data for analysis:
• **CSV Export**: Download data in CSV format
• **Excel Export**: Export with formatting and charts
• **JSON Export**: Machine-readable data format
• **Report Generation**: Automated compliance reports
• **Scheduled Exports**: Regular data backups`
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: BarChart3,
      description: 'Understanding system insights and reports',
      content: [
        {
          title: 'Analytics Dashboard',
          content: `The analytics section provides deep insights:
• **Performance Trends**: Historical performance patterns
• **Capacity Planning**: Resource utilization forecasts
• **Alert Analysis**: Alert frequency and resolution patterns
• **Agent Performance**: AI agent effectiveness metrics
• **Cost Analysis**: Infrastructure cost optimization insights`
        },
        {
          title: 'Report Types',
          content: `Available reports:
• **Health Reports**: Overall system health summaries
• **Performance Reports**: Detailed performance analysis
• **Compliance Reports**: Audit trail and regulatory compliance
• **Cost Reports**: Infrastructure cost breakdowns
• **Trend Analysis**: Long-term pattern identification
• **Custom Reports**: Build reports for specific needs`
        },
        {
          title: 'Scheduling Reports',
          content: `Automate report generation:
• **Daily Reports**: System health summaries
• **Weekly Reports**: Performance and trend analysis
• **Monthly Reports**: Comprehensive business reviews
• **Quarterly Reports**: Strategic planning insights
• **Custom Schedules**: Define your own timing
• **Email Delivery**: Automatic report distribution`
        }
      ]
    },
    {
      id: 'configuration',
      title: 'System Configuration',
      icon: Settings,
      description: 'Configuring platform settings',
      content: [
        {
          title: 'General Settings',
          content: `Configure basic platform settings:
• **Organization Name**: Your company name
• **Time Zone**: System time zone setting
• **Date Format**: Date display preferences
• **Language**: Interface language selection
• **Theme**: Light or dark mode preference`
        },
        {
          title: 'Alert Configuration',
          content: `Customize alert behavior:
• **Thresholds**: Set custom alert thresholds for each metric
• **Notification Channels**: Configure email, Slack, webhook endpoints
• **Escalation Rules**: Define alert escalation patterns
• **Suppression Rules**: Set alert suppression during maintenance
• **Acknowledgment Timeouts**: Auto-acknowledge settings`
        },
        {
          title: 'Agent Configuration',
          content: `Configure AI agent behavior:
• **Execution Intervals**: How often agents run
• **Confidence Thresholds**: Minimum confidence for actions
• **Resource Limits**: CPU and memory limits for agent processes
• **API Keys**: Configure external service integrations
• **Logging Levels**: Set agent logging verbosity`
        },
        {
          title: 'Security Settings',
          content: `Manage platform security:
• **User Authentication**: SSO and local authentication options
• **API Keys**: Generate and manage API access keys
• **Role Permissions**: Define custom user roles and permissions
• **Session Management**: Configure session timeouts and policies
• **Audit Logging**: Enable comprehensive audit logging`
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: HelpCircle,
      description: 'Common issues and solutions',
      content: [
        {
          title: 'Agent Issues',
          content: `Common agent problems and solutions:

**Agent Not Running**
• Check agent status in Agents page
• Verify configuration settings
• Review error logs in agent details
• Restart agent if necessary

**Low Confidence Scores**
• Increase historical data collection period
• Adjust confidence thresholds in agent settings
• Review training data quality
• Check for data anomalies

**High False Positive Rate**
• Fine-tune alert thresholds
• Increase confidence requirements
• Review and adjust baseline metrics
• Add custom filters for specific conditions`
        },
        {
          title: 'Data Issues',
          content: `Data-related troubleshooting:

**Missing Metrics**
• Verify server connectivity
• Check telemetry collector status
• Review firewall and network settings
• Validate server agent installation

**Incorrect Data**
• Run Data Agent cleaning process
• Check data source accuracy
• Verify time zone settings
• Review metric calculation formulas

**Upload Failures**
• Verify file format compatibility
• Check file size limits (max 50MB)
• Ensure proper column mapping
• Review data validation errors`
        },
        {
          title: 'Performance Issues',
          content: `Platform performance troubleshooting:

**Slow Dashboard Loading**
• Clear browser cache
• Check network connectivity
• Reduce dashboard refresh interval
• Contact support for server issues

**Alert Delays**
• Check agent execution intervals
• Verify notification channel configuration
• Review system resource utilization
• Check for network latency issues

**Remediation Timeouts**
• Increase action timeout settings
• Check target server connectivity
• Review system resource availability
• Verify approval workflow efficiency`
        }
      ]
    }
  ];

  const quickStart = [
    {
      step: 1,
      title: "Add Your Servers",
      description: "Start by adding your servers to the monitoring system",
      action: "Go to Servers page and click 'Add Server'"
    },
    {
      step: 2,
      title: "Configure Agents",
      description: "Set up AI agents to monitor your infrastructure",
      action: "Visit Agents page and configure monitoring agents"
    },
    {
      step: 3,
      title: "Set Alert Thresholds",
      description: "Customize alert thresholds for your environment",
      action: "Go to Settings and configure alert thresholds"
    },
    {
      step: 4,
      title: "Set Up Workflows",
      description: "Configure approval workflows for automated actions",
      action: "Visit Workflows and set up approval processes"
    },
    {
      step: 5,
      title: "Monitor Dashboard",
      description: "Watch your infrastructure health on the main dashboard",
      action: "Return to Dashboard to monitor your systems"
    }
  ];

  const filteredSections = helpSections.filter(section =>
    searchQuery === "" || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.some(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-dark-surface">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AgentOps Help Center</h1>
                <p className="text-slate-400">Complete guide to using the platform</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/')}
              data-testid="button-back-dashboard"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search help topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-help"
                />
              </div>

              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Play className="w-5 h-5 mr-2" />
                    Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickStart.map((item) => (
                    <div key={item.step} className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {item.step}
                        </Badge>
                        <span className="font-medium text-white">{item.title}</span>
                      </div>
                      <p className="text-muted-foreground text-xs ml-8">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contact Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Need More Help?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    User Manual
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Video Tutorials
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="guides">User Guides</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Platform Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Welcome to AgentOps</CardTitle>
                    <CardDescription>
                      AgentOps is an AI-powered server health monitoring and automated remediation platform designed for financial institutions and mission-critical environments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-white">Key Features</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Real-time server monitoring</li>
                          <li>• AI-powered anomaly detection</li>
                          <li>• Automated remediation actions</li>
                          <li>• Predictive analytics</li>
                          <li>• Compliance-ready workflows</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-white">AI Agents</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Telemetry Collector</li>
                          <li>• Anomaly Detector</li>
                          <li>• Predictive Analytics</li>
                          <li>• Recommendation Engine</li>
                          <li>• Approval & Compliance</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation Guide */}
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Navigation</CardTitle>
                    <CardDescription>Understanding the main sections of AgentOps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { name: "Dashboard", icon: BarChart3, desc: "System overview and metrics", path: "/" },
                        { name: "Servers", icon: Server, desc: "Server inventory and status", path: "/servers" },
                        { name: "Agents", icon: Bot, desc: "AI agent management", path: "/agents" },
                        { name: "Alerts", icon: AlertTriangle, desc: "Alert monitoring", path: "/alerts" },
                        { name: "Remediations", icon: Wrench, desc: "Automated actions", path: "/remediations" },
                        { name: "Workflows", icon: GitBranch, desc: "Approval processes", path: "/workflows" },
                        { name: "Analytics", icon: BarChart3, desc: "Reports and insights", path: "/analytics" },
                        { name: "Data Management", icon: Database, desc: "Data import/export", path: "/data-management" },
                        { name: "Settings", icon: Settings, desc: "Platform configuration", path: "/configuration" }
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.name} href={item.path}>
                            <div className="p-3 border border-dark-border rounded-lg hover:border-primary/50 hover:bg-dark-accent/20 transition-all cursor-pointer group">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Icon className="w-4 h-4 text-primary group-hover:text-primary/80" />
                                  <span className="font-medium text-white text-sm group-hover:text-primary/90">{item.name}</span>
                                </div>
                                <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">{item.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="space-y-6">
                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      title: "AI-Powered Monitoring",
                      icon: Bot,
                      description: "8 specialized AI agents continuously monitor your infrastructure",
                      features: ["Real-time telemetry collection", "Anomaly detection", "Predictive analytics", "Intelligent recommendations"]
                    },
                    {
                      title: "Automated Remediation",
                      icon: Wrench,
                      description: "Fix issues automatically with AI-driven solutions",
                      features: ["Service restarts", "Resource scaling", "Configuration updates", "Disk cleanup"]
                    },
                    {
                      title: "Workflow Management",
                      icon: GitBranch,
                      description: "Compliance-ready approval processes for automated actions",
                      features: ["Risk-based routing", "Multi-level approvals", "Audit trails", "Role-based access"]
                    },
                    {
                      title: "Advanced Analytics",
                      icon: BarChart3,
                      description: "Deep insights into your infrastructure performance",
                      features: ["Performance trends", "Capacity planning", "Cost optimization", "Custom reports"]
                    }
                  ].map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Card key={feature.title}>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Icon className="w-5 h-5 mr-2" />
                            {feature.title}
                          </CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {feature.features.map((feat, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-center">
                                <ChevronRight className="w-3 h-3 mr-2" />
                                {feat}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="guides" className="space-y-6">
                {/* User Guides */}
                <div className="space-y-4">
                  {filteredSections.map((section) => {
                    const Icon = section.icon;
                    const isOpen = openSections.includes(section.id);
                    
                    return (
                      <Card key={section.id}>
                        <Collapsible>
                          <CollapsibleTrigger 
                            className="w-full"
                            onClick={() => toggleSection(section.id)}
                          >
                            <CardHeader className="hover:bg-dark-surface/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Icon className="w-5 h-5 text-primary" />
                                  <div className="text-left">
                                    <CardTitle className="text-lg">{section.title}</CardTitle>
                                    <CardDescription>{section.description}</CardDescription>
                                  </div>
                                </div>
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="space-y-6">
                              {section.content.map((item, index) => (
                                <div key={index} className="space-y-2">
                                  <h4 className="font-semibold text-white">{item.title}</h4>
                                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                                    {item.content}
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}