# Remediation Commands User Guide

## How Users Can Execute Remediation Commands

This comprehensive guide explains how users interact with the automated remediation command execution system through the web interface.

## 🚀 Getting Started

### Step 1: Access the Remediation Commands Page

1. Navigate to the **Remediation Commands** section in the main dashboard
2. You'll see three main tabs:
   - **Execute Commands**: Run remediation commands on servers
   - **Server Connections**: Set up secure connections to your servers
   - **Command Templates**: View available pre-approved command templates

## 🔧 Setting Up Server Connections (First Time Setup)

### Step 2: Register Server Connections

**Before executing any commands, you must register secure connections to your servers.**

1. Go to the **Server Connections** tab
2. Click "Register Server Connection"
3. Fill in the connection details:

#### SSH Connection Setup:
```
Server: Select from monitored servers
Connection Type: SSH
Host/IP: 192.168.1.100
Port: 22
Username: admin
SSH Key Path: /path/to/private/key (optional)
```

#### Windows Remote Management (WinRM):
```
Server: Select Windows server
Connection Type: WinRM
Host/IP: 192.168.1.101
Port: 5985
Username: administrator
```

#### REST API Connection:
```
Server: Select server with API
Connection Type: REST API
API Endpoint: https://server.example.com/api/execute
API Key: your-api-key-here
```

#### Local Execution (for testing):
```
Server: Select local server
Connection Type: Local
```

4. Click **"Register Connection"**
5. Test the connection using the **"Test"** button

## 📋 Executing Template Commands (Recommended)

### Step 3: Use Pre-Approved Templates

Template commands are **pre-approved and include built-in safety checks** - perfect for production environments.

1. Go to **Execute Commands** tab
2. In the **Template Commands** section:

#### Available Templates:
- **Restart Service**: Restart system services (Apache, Nginx, MySQL, etc.)
- **Cleanup Temp Files**: Remove old temporary files to free disk space
- **Clear Cache**: Clear application caches and restart services
- **Memory Optimization**: Clear system memory caches
- **Stop Service**: Safely stop system services

#### Execution Steps:
1. **Select Target Server**: Choose from registered server connections
2. **Select Command Template**: Pick the appropriate template
3. **Fill Parameters**: Enter required parameters (e.g., service_name: "apache2")
4. **Click Execute**: The system will:
   - Run safety checks first
   - Execute the command with timeout protection
   - Log all actions for audit trail
   - Display results in real-time

#### Example: Restarting Apache Service
```
Target Server: web-server-01 (SSH)
Template: Restart Service
Parameters:
  - service_name: apache2
```

## ⚡ Custom Command Execution (Advanced Users)

### Step 4: Execute Custom Commands

**⚠️ Warning**: Custom commands bypass safety templates. Use with extreme caution on production servers.

1. In the **Custom Commands** section:
2. **Select Target Server**: Choose registered connection
3. **Enter Command**: Type your custom shell command
4. **Execute**: System will run the command directly

#### Example Custom Commands:
```bash
# Check disk usage
df -h

# View running processes
ps aux | head -20

# Check service status
systemctl status nginx

# View system uptime and load
uptime && cat /proc/loadavg
```

## 📊 Monitoring Command Execution

### Real-Time Feedback
- **Success/Failure Status**: Immediate notification of command results
- **Execution Time**: See how long commands took to run
- **Output Display**: View command output and error messages
- **Toast Notifications**: Get popup notifications for command completion

### Audit Trail
- All command executions are logged in the **Audit Logs**
- Track who executed what commands and when
- Review command results and system changes
- Maintain compliance for security audits

## 🛡️ Security Features

### Built-in Safety Measures:
1. **Safety Checks**: Templates run validation commands before execution
2. **Timeout Protection**: Commands automatically timeout after specified duration
3. **Audit Logging**: Complete trail of all command executions
4. **Connection Validation**: Test connections before executing commands
5. **Parameter Validation**: Template parameters are validated before execution

### Access Control:
- Only registered servers can receive commands
- Connection credentials are securely stored
- All actions are logged with user attribution
- Failed connections are automatically detected

## 🔄 Integration with AI Agents

### Automated Remediation
- **AI Detection**: Anomaly Detector identifies issues
- **Smart Recommendations**: Recommendation Engine suggests fixes
- **Approval Workflow**: Approval & Compliance validates remediation
- **Automatic Execution**: Remediation Executor runs approved commands
- **Result Tracking**: Complete cycle from detection to resolution

### Manual Override
- Users can manually trigger any template command
- Override AI recommendations when needed
- Execute emergency fixes immediately
- Test fixes before full automation

## 📱 User Interface Features

### Dashboard Integration
- **Server Status**: Real-time connection health indicators
- **Command History**: Recent executions and results
- **Template Library**: Browse available command templates
- **Connection Manager**: Manage all server connections in one place

### Mobile-Friendly Design
- Responsive interface works on tablets and phones
- Touch-friendly buttons and forms
- Streamlined mobile navigation
- Essential features accessible on mobile

## 🚨 Best Practices

### Production Server Guidelines:
1. **Always use templates** for production systems
2. **Test connections** before executing commands
3. **Review parameters** carefully before execution
4. **Monitor results** and verify system health after execution
5. **Use custom commands sparingly** and only when necessary

### Development/Testing:
- Use local or development servers for testing new commands
- Validate custom commands in non-production first
- Create new templates for frequently used command patterns

### Security Recommendations:
- Regularly rotate SSH keys and API credentials
- Use dedicated service accounts with minimal required permissions
- Monitor audit logs for suspicious activity
- Test disaster recovery procedures regularly

## 🔧 Troubleshooting

### Connection Issues:
- Verify network connectivity to target servers
- Check SSH key permissions and paths
- Validate API endpoints and credentials
- Ensure firewall rules allow connections

### Command Failures:
- Review error messages in execution results
- Check server logs for additional context
- Verify user permissions on target systems
- Test commands manually via direct SSH first

### Template Problems:
- Ensure all required parameters are provided
- Check parameter formats match expectations
- Review safety check failures for blocking issues
- Contact administrators for template modifications

## 📞 Support and Documentation

### Getting Help:
- Review command execution logs for error details
- Check audit trail for historical context
- Use the built-in Conversational AI for assistance
- Contact system administrators for access issues

### Feature Requests:
- Request new command templates through admin channels
- Suggest safety improvements for existing templates
- Report bugs or usability issues
- Provide feedback on user experience

---

**This system provides enterprise-grade command execution with comprehensive safety measures, audit trails, and user-friendly interfaces for managing critical server infrastructure.**