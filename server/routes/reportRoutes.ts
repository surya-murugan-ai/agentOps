import { Router } from 'express';
import type { DatabaseStorage } from '../storage';

export function createReportRoutes(storage: DatabaseStorage) {
  const router = Router();

  // Generate Performance Report
  router.post('/performance', async (req, res) => {
    try {
      const { timeRange = '24h' } = req.body;
      
      // Get performance data
      const servers = await storage.getAllServers();
      const metrics = await storage.getMetricsInRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
      const alerts = await storage.getAllAlerts();
      const remediations = await storage.getAllRemediationActions();
      
      // Calculate performance metrics
      const healthyServers = servers.filter(s => s.status === 'healthy').length;
      const serverHealthPercentage = ((healthyServers / servers.length) * 100).toFixed(1);
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;
      const totalAlerts = alerts.length;
      
      const executedRemediations = remediations.filter(r => r.status === 'executed').length;
      const remediationSuccessRate = remediations.length > 0 ? 
        ((executedRemediations / remediations.length) * 100).toFixed(1) : '0';
      
      // Calculate average response times from metrics
      const avgCpuUsage = metrics.length > 0 ? 
        (metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length).toFixed(1) : '0';
      
      const report = {
        id: `perf-${Date.now()}`,
        type: 'performance',
        title: 'Infrastructure Performance Report',
        generatedAt: new Date().toISOString(),
        timeRange,
        summary: {
          serverHealth: `${serverHealthPercentage}%`,
          totalServers: servers.length,
          healthyServers,
          criticalAlerts,
          avgCpuUsage: `${avgCpuUsage}%`,
          remediationSuccessRate: `${remediationSuccessRate}%`
        },
        sections: [
          {
            title: 'Server Health Overview',
            content: `Monitoring ${servers.length} servers with ${serverHealthPercentage}% overall health rating.`,
            data: servers.map(s => ({
              hostname: s.hostname,
              status: s.status,
              lastSeen: s.lastSeen
            }))
          },
          {
            title: 'Performance Metrics',
            content: `Average CPU usage across all servers is ${avgCpuUsage}% over the last ${timeRange}.`,
            data: metrics.slice(-24).map(m => ({
              timestamp: m.timestamp,
              value: m.value,
              type: m.type
            }))
          },
          {
            title: 'Alert Summary',
            content: `${totalAlerts} total alerts generated, ${criticalAlerts} critical alerts currently active.`,
            data: alerts.slice(-10).map(a => ({
              title: a.title,
              severity: a.severity,
              status: a.status,
              createdAt: a.createdAt
            }))
          }
        ]
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ error: 'Failed to generate performance report' });
    }
  });

  // Generate Security Report
  router.post('/security', async (req, res) => {
    try {
      const { timeRange = '24h' } = req.body;
      
      const alerts = await storage.getAllAlerts();
      const auditLogs = await storage.getAllAuditLogs();
      const agents = await storage.getAllAgents();
      
      // Security-focused metrics
      const securityAlerts = alerts.filter(a => 
        a.description?.toLowerCase().includes('security') || 
        a.description?.toLowerCase().includes('unauthorized') ||
        a.severity === 'critical'
      );
      
      const recentSecurityEvents = securityAlerts.filter(a => 
        new Date(a.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      const complianceScore = securityAlerts.length === 0 ? 100 : 
        Math.max(0, 100 - (securityAlerts.length * 10));
      
      const activeSecurityAgents = agents.filter(a => 
        a.type === 'detector' || a.type === 'approval'
      ).length;
      
      const report = {
        id: `sec-${Date.now()}`,
        type: 'security',
        title: 'Security & Compliance Report',
        generatedAt: new Date().toISOString(),
        timeRange,
        summary: {
          complianceScore: `${complianceScore}%`,
          securityAlerts: securityAlerts.length,
          recentEvents: recentSecurityEvents.length,
          activeSecurityAgents,
          auditEntries: auditLogs.length
        },
        sections: [
          {
            title: 'Security Status',
            content: `System compliance score: ${complianceScore}%. ${recentSecurityEvents.length} security events in the last ${timeRange}.`,
            data: recentSecurityEvents.map(a => ({
              title: a.title,
              severity: a.severity,
              status: a.status,
              createdAt: a.createdAt
            }))
          },
          {
            title: 'Audit Trail',
            content: `${auditLogs.length} audit entries logged for compliance tracking.`,
            data: auditLogs.slice(-20).map(log => ({
              action: log.action,
              component: log.component,
              timestamp: log.timestamp,
              status: log.status
            }))
          },
          {
            title: 'Security Agents',
            content: `${activeSecurityAgents} security agents actively monitoring infrastructure.`,
            data: agents.filter(a => a.type === 'detector' || a.type === 'approval').map(a => ({
              name: a.name,
              type: a.type,
              status: a.status,
              lastHeartbeat: a.lastHeartbeat
            }))
          }
        ]
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating security report:', error);
      res.status(500).json({ error: 'Failed to generate security report' });
    }
  });

  // Generate Trend Analysis Report
  router.post('/trends', async (req, res) => {
    try {
      const { timeRange = '24h' } = req.body;
      
      const metrics = await storage.getMetricsInRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());
      const alerts = await storage.getAllAlerts();
      const predictions = await storage.getAllPredictions();
      
      // Trend calculations
      const cpuMetrics = metrics.filter(m => m.type === 'cpu');
      const memoryMetrics = metrics.filter(m => m.type === 'memory');
      
      const avgCpuTrend = cpuMetrics.length > 0 ? 
        (cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length).toFixed(1) : '0';
      
      const avgMemoryTrend = memoryMetrics.length > 0 ? 
        (memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length).toFixed(1) : '0';
      
      // Alert trends
      const alertTrend = alerts.filter(a => 
        new Date(a.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
      
      // Prediction accuracy
      const accuratePredictions = predictions.filter(p => 
        parseFloat(p.confidence) > 75
      ).length;
      
      const report = {
        id: `trend-${Date.now()}`,
        type: 'trends',
        title: 'Trend Analysis & Forecasting Report',
        generatedAt: new Date().toISOString(),
        timeRange,
        summary: {
          avgCpuTrend: `${avgCpuTrend}%`,
          avgMemoryTrend: `${avgMemoryTrend}%`,
          alertTrend: alertTrend,
          totalPredictions: predictions.length,
          accuratePredictions,
          forecastAccuracy: predictions.length > 0 ? 
            `${((accuratePredictions / predictions.length) * 100).toFixed(1)}%` : '0%'
        },
        sections: [
          {
            title: 'Resource Usage Trends',
            content: `CPU usage trending at ${avgCpuTrend}%, memory at ${avgMemoryTrend}% over the last ${timeRange}.`,
            data: metrics.slice(-50).map(m => ({
              timestamp: m.timestamp,
              type: m.type,
              value: m.value,
              serverId: m.serverId
            }))
          },
          {
            title: 'Alert Patterns',
            content: `${alertTrend} alerts generated in the last ${timeRange}, showing system activity patterns.`,
            data: alerts.slice(-20).map(a => ({
              title: a.title,
              severity: a.severity,
              createdAt: a.createdAt,
              metricType: a.metricType
            }))
          },
          {
            title: 'Predictive Insights',
            content: `${predictions.length} predictions generated with ${((accuratePredictions / predictions.length) * 100).toFixed(1)}% accuracy rate.`,
            data: predictions.slice(-15).map(p => ({
              serverId: p.serverId,
              metricType: p.metricType,
              currentValue: p.currentValue,
              predictedValue: p.predictedValue,
              confidence: p.confidence,
              predictionTime: p.predictionTime
            }))
          }
        ]
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating trend analysis report:', error);
      res.status(500).json({ error: 'Failed to generate trend analysis report' });
    }
  });

  return router;
}