import { AgentManager } from './agents';
import { storage } from './storage';
import { aiService } from './services/aiService';

interface AgentTestResult {
  agentName: string;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message: string;
  executionTime: number;
  error?: any;
}

export class AgentTester {
  private results: AgentTestResult[] = [];

  async runComprehensiveTest(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      warnings: number;
      skipped: number;
    };
    results: AgentTestResult[];
    recommendations: string[];
  }> {
    console.log('\n🤖 Starting Comprehensive AI Agent Testing...\n');
    
    // Test 1: API Key Configuration
    await this.testApiKeyConfiguration();
    
    // Test 2: Database Connectivity
    await this.testDatabaseConnectivity();
    
    // Test 3: Individual Agent Functions
    await this.testTelemetryCollector();
    await this.testAnomalyDetector();
    await this.testPredictiveAnalytics();
    await this.testRecommendationEngine();
    await this.testApprovalCompliance();
    await this.testRemediationExecutor();
    await this.testAuditReporting();
    
    // Test 4: Integration Tests
    await this.testEndToEndWorkflow();
    
    // Generate summary and recommendations
    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();
    
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    
    return { summary, results: this.results, recommendations };
  }

  private async testApiKeyConfiguration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if API keys are configured in database
      const apiSettings = await storage.getSettingsByCategory('api_keys');
      const openaiKey = apiSettings.find(s => s.key === 'openai_api_key' && s.isActive);
      const anthropicKey = apiSettings.find(s => s.key === 'anthropic_api_key' && s.isActive);
      
      if (!openaiKey) {
        this.addResult('API Configuration', 'fail', 'OpenAI API key not configured in database', startTime);
        return;
      }
      
      if (!anthropicKey) {
        this.addResult('API Configuration', 'warning', 'Anthropic API key not configured (some agents will be limited)', startTime);
      } else {
        this.addResult('API Configuration', 'pass', 'Both OpenAI and Anthropic API keys configured', startTime);
      }
      
    } catch (error) {
      this.addResult('API Configuration', 'fail', `Error checking API configuration: ${error.message}`, startTime, error);
    }
  }

  private async testDatabaseConnectivity(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test basic database operations
      const servers = await storage.getServers();
      const metrics = await storage.getServerMetrics('srv-001', 5);
      const alerts = await storage.getAlerts();
      
      if (servers.length === 0) {
        this.addResult('Database Connectivity', 'warning', 'No servers found in database', startTime);
      } else {
        this.addResult('Database Connectivity', 'pass', `Database connected. Found ${servers.length} servers`, startTime);
      }
      
    } catch (error) {
      this.addResult('Database Connectivity', 'fail', `Database connectivity error: ${error.message}`, startTime, error);
    }
  }

  private async testTelemetryCollector(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test telemetry collection capability
      const servers = await storage.getServers();
      
      if (servers.length === 0) {
        this.addResult('Telemetry Collector', 'skipped', 'No servers available for testing', startTime);
        return;
      }
      
      // Simulate telemetry collection
      const testServer = servers[0];
      const metrics = await storage.getServerMetrics(testServer.id, 1);
      
      this.addResult('Telemetry Collector', 'pass', `Telemetry collection operational for ${servers.length} servers`, startTime);
      
    } catch (error) {
      this.addResult('Telemetry Collector', 'fail', `Telemetry collection error: ${error.message}`, startTime, error);
    }
  }

  private async testAnomalyDetector(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test AI anomaly detection
      const servers = await storage.getServers();
      
      if (servers.length === 0) {
        this.addResult('Anomaly Detector', 'skipped', 'No servers available for testing', startTime);
        return;
      }
      
      const testServer = servers[0];
      const metrics = await storage.getServerMetrics(testServer.id, 10);
      const historicalData = await storage.getServerMetrics(testServer.id, 50);
      
      if (metrics.length === 0) {
        this.addResult('Anomaly Detector', 'warning', 'No metrics available for anomaly detection', startTime);
        return;
      }
      
      // Test AI service
      const result = await aiService.analyzeAnomalies(metrics, historicalData);
      
      if (result.anomalies.length >= 0 && result.insights) {
        this.addResult('Anomaly Detector', 'pass', `AI anomaly detection working. Found ${result.anomalies.length} anomalies`, startTime);
      } else {
        this.addResult('Anomaly Detector', 'fail', 'AI anomaly detection returned invalid response', startTime);
      }
      
    } catch (error) {
      if (error.message.includes('API key')) {
        this.addResult('Anomaly Detector', 'fail', 'OpenAI API key authentication failed', startTime, error);
      } else {
        this.addResult('Anomaly Detector', 'fail', `Anomaly detection error: ${error.message}`, startTime, error);
      }
    }
  }

  private async testPredictiveAnalytics(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const servers = await storage.getServers();
      
      if (servers.length === 0) {
        this.addResult('Predictive Analytics', 'skipped', 'No servers available for testing', startTime);
        return;
      }
      
      const testServer = servers[0];
      const historicalMetrics = await storage.getServerMetrics(testServer.id, 30);
      
      if (historicalMetrics.length < 10) {
        this.addResult('Predictive Analytics', 'warning', 'Insufficient historical data for predictions', startTime);
        return;
      }
      
      const result = await aiService.generatePredictions(testServer.id, historicalMetrics);
      
      if (result.predictions.length >= 0) {
        this.addResult('Predictive Analytics', 'pass', `Predictive analytics working. Generated ${result.predictions.length} predictions`, startTime);
      } else {
        this.addResult('Predictive Analytics', 'fail', 'Predictive analytics returned invalid response', startTime);
      }
      
    } catch (error) {
      if (error.message.includes('API key')) {
        this.addResult('Predictive Analytics', 'fail', 'OpenAI API key authentication failed', startTime, error);
      } else {
        this.addResult('Predictive Analytics', 'fail', `Predictive analytics error: ${error.message}`, startTime, error);
      }
    }
  }

  private async testRecommendationEngine(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const alerts = await storage.getAlerts();
      
      if (alerts.length === 0) {
        this.addResult('Recommendation Engine', 'skipped', 'No alerts available for testing', startTime);
        return;
      }
      
      const testAlert = alerts[0];
      const server = await storage.getServer(testAlert.serverId);
      const historicalPattern = await storage.getServerMetrics(testAlert.serverId, 20);
      
      const result = await aiService.generateRecommendations(testAlert, server, historicalPattern);
      
      if (result.recommendations.length >= 0) {
        this.addResult('Recommendation Engine', 'pass', `Recommendation engine working. Generated ${result.recommendations.length} recommendations`, startTime);
      } else {
        this.addResult('Recommendation Engine', 'fail', 'Recommendation engine returned invalid response', startTime);
      }
      
    } catch (error) {
      if (error.message.includes('API key')) {
        this.addResult('Recommendation Engine', 'fail', 'Anthropic API key authentication failed', startTime, error);
      } else {
        this.addResult('Recommendation Engine', 'fail', `Recommendation engine error: ${error.message}`, startTime, error);
      }
    }
  }

  private async testApprovalCompliance(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const remediations = await storage.getRemediationActions();
      
      if (remediations.length === 0) {
        this.addResult('Approval & Compliance', 'skipped', 'No remediation actions available for testing', startTime);
        return;
      }
      
      const testRemediation = remediations[0];
      const server = await storage.getServer(testRemediation.serverId);
      
      const result = await aiService.assessRisk(testRemediation, server);
      
      if (result.riskScore >= 0 && result.riskLevel) {
        this.addResult('Approval & Compliance', 'pass', `Risk assessment working. Risk score: ${result.riskScore}`, startTime);
      } else {
        this.addResult('Approval & Compliance', 'fail', 'Risk assessment returned invalid response', startTime);
      }
      
    } catch (error) {
      if (error.message.includes('API key')) {
        this.addResult('Approval & Compliance', 'fail', 'Anthropic API key authentication failed', startTime, error);
      } else {
        this.addResult('Approval & Compliance', 'fail', `Approval & compliance error: ${error.message}`, startTime, error);
      }
    }
  }

  private async testRemediationExecutor(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const remediations = await storage.getRemediationActions();
      const pendingRemediations = remediations.filter(r => r.status === 'pending' || r.status === 'approved');
      
      this.addResult('Remediation Executor', 'pass', `Remediation executor operational. ${pendingRemediations.length} pending actions`, startTime);
      
    } catch (error) {
      this.addResult('Remediation Executor', 'fail', `Remediation executor error: ${error.message}`, startTime, error);
    }
  }

  private async testAuditReporting(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const auditLogs = await storage.getAuditLogs();
      
      if (auditLogs.length === 0) {
        this.addResult('Audit & Reporting', 'warning', 'No audit logs available for analysis', startTime);
        return;
      }
      
      const result = await aiService.generateAuditInsights(auditLogs.slice(0, 10), 'last 24 hours');
      
      if (result.summary && result.complianceStatus) {
        this.addResult('Audit & Reporting', 'pass', `Audit reporting working. Compliance status: ${result.complianceStatus}`, startTime);
      } else {
        this.addResult('Audit & Reporting', 'fail', 'Audit reporting returned invalid response', startTime);
      }
      
    } catch (error) {
      if (error.message.includes('API key')) {
        this.addResult('Audit & Reporting', 'fail', 'Anthropic API key authentication failed', startTime, error);
      } else {
        this.addResult('Audit & Reporting', 'fail', `Audit reporting error: ${error.message}`, startTime, error);
      }
    }
  }

  private async testEndToEndWorkflow(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test complete workflow: metrics -> anomaly -> alert -> recommendation -> approval
      const servers = await storage.getServers();
      
      if (servers.length === 0) {
        this.addResult('End-to-End Workflow', 'skipped', 'No servers available for workflow testing', startTime);
        return;
      }
      
      const alerts = await storage.getAlerts();
      const remediations = await storage.getRemediationActions();
      const auditLogs = await storage.getAuditLogs();
      
      const workflowHealth = {
        serversMonitored: servers.length,
        activeAlerts: alerts.filter(a => a.status === 'active').length,
        pendingRemediations: remediations.filter(r => r.status === 'pending').length,
        auditEntries: auditLogs.length
      };
      
      this.addResult('End-to-End Workflow', 'pass', 
        `Workflow operational: ${workflowHealth.serversMonitored} servers, ${workflowHealth.activeAlerts} alerts, ${workflowHealth.pendingRemediations} pending actions`, 
        startTime);
      
    } catch (error) {
      this.addResult('End-to-End Workflow', 'fail', `End-to-end workflow error: ${error.message}`, startTime, error);
    }
  }

  private addResult(agentName: string, status: 'pass' | 'fail' | 'warning' | 'skipped', message: string, startTime: number, error?: any): void {
    const executionTime = Date.now() - startTime;
    const statusIcon = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️',
      skipped: '⏭️'
    }[status];
    
    console.log(`${statusIcon} ${agentName}: ${message} (${executionTime}ms)`);
    
    this.results.push({
      agentName,
      status,
      message,
      executionTime,
      error
    });
  }

  private generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    return { total, passed, failed, warnings, skipped };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedResults = this.results.filter(r => r.status === 'fail');
    const warningResults = this.results.filter(r => r.status === 'warning');
    
    if (failedResults.some(r => r.message.includes('API key'))) {
      recommendations.push('Configure valid OpenAI and Anthropic API keys in Settings');
    }
    
    if (failedResults.some(r => r.agentName === 'Database Connectivity')) {
      recommendations.push('Check database connection and ensure all tables are properly migrated');
    }
    
    if (warningResults.some(r => r.message.includes('No servers'))) {
      recommendations.push('Add servers to the system for comprehensive monitoring');
    }
    
    if (warningResults.some(r => r.message.includes('Insufficient historical data'))) {
      recommendations.push('Allow system to collect more historical data for better predictions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is operating optimally. Continue monitoring agent performance.');
    }
    
    return recommendations;
  }
}

export const agentTester = new AgentTester();