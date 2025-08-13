import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export class AuditReportingAgent implements Agent {
  public readonly id = "audit-reporting-001";
  public readonly name = "Audit & Reporting";
  public readonly type = "audit";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private reportsGenerated = 0;
  private errorCount = 0;

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Generate reports and maintain audit trail every 5 minutes
    this.intervalId = setInterval(() => {
      this.generateReportsAndAudit();
    }, 300000);

    // Initial audit
    await this.generateReportsAndAudit();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    
    console.log(`Stopping ${this.name}...`);
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.running ? "active" : "inactive",
      cpuUsage: this.getRandomBetween(2, 6),
      memoryUsage: this.getRandomBetween(300, 500),
      processedCount: this.processedCount,
      reportsGenerated: this.reportsGenerated,
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  private async generateReportsAndAudit() {
    if (!this.running) return;

    try {
      await this.performSystemAudit();
      await this.generateComplianceReport();
      await this.trackSystemMetrics();
      
      this.processedCount++;
      console.log(`${this.name}: Completed audit and reporting cycle`);
    } catch (error) {
      console.error(`${this.name}: Error during audit and reporting:`, error);
      this.errorCount++;
    }
  }

  private async performSystemAudit() {
    // Audit system health and performance
    const dashboardMetrics = await storage.getDashboardMetrics();
    const agents = await storage.getAllAgents();
    const recentAlerts = await storage.getActiveAlerts();
    const recentActions = await storage.getPendingRemediationActions();

    // Create system health audit log
    await storage.createAuditLog({
      agentId: this.id,
      action: "System Health Audit",
      details: `System health check completed. ${dashboardMetrics.totalServers} servers monitored, ${dashboardMetrics.activeAlerts} active alerts`,
      status: "success",
      impact: "System monitoring operational",
      metadata: {
        servers: {
          total: dashboardMetrics.totalServers,
          healthy: dashboardMetrics.healthyServers,
          warning: dashboardMetrics.warningServers,
          critical: dashboardMetrics.criticalServers,
        },
        agents: {
          total: agents.length,
          active: dashboardMetrics.activeAgents,
        },
        alerts: {
          active: dashboardMetrics.activeAlerts,
          critical: dashboardMetrics.criticalAlerts,
        },
        remediations: {
          pending: recentActions.length,
          todayTotal: dashboardMetrics.remediationsToday,
        },
      },
    });
  }

  private async generateComplianceReport() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get audit logs for last 24 hours
    const recentLogs = await storage.getAuditLogs(100);
    const last24HourLogs = recentLogs.filter(log => 
      log.timestamp && new Date(log.timestamp) > last24Hours
    );

    // Analyze compliance metrics
    const complianceMetrics = {
      totalActions: last24HourLogs.length,
      successfulActions: last24HourLogs.filter(log => log.status === "success").length,
      failedActions: last24HourLogs.filter(log => log.status === "failed").length,
      pendingActions: last24HourLogs.filter(log => log.status === "pending").length,
      autoApprovedActions: last24HourLogs.filter(log => 
        log.action.includes("Auto-Approve") || log.details.includes("auto-approved")
      ).length,
      manualApprovalActions: last24HourLogs.filter(log => 
        log.action.includes("Manual Approval") || log.details.includes("manual approval")
      ).length,
    };

    const successRate = complianceMetrics.totalActions > 0 ? 
      (complianceMetrics.successfulActions / complianceMetrics.totalActions * 100).toFixed(2) : "0";

    // Create compliance report audit log
    await storage.createAuditLog({
      agentId: this.id,
      action: "Generate Compliance Report",
      details: `24-hour compliance report generated. Success rate: ${successRate}%, Total actions: ${complianceMetrics.totalActions}`,
      status: "success",
      impact: "Compliance monitoring active",
      metadata: {
        reportPeriod: "24h",
        metrics: complianceMetrics,
        successRate: parseFloat(successRate),
        generatedAt: now.toISOString(),
      },
    });

    this.reportsGenerated++;

    // Broadcast compliance update
    wsManager.broadcast({
      type: "compliance_report",
      data: {
        period: "24h",
        metrics: complianceMetrics,
        successRate: parseFloat(successRate),
        timestamp: now.toISOString(),
      }
    });
  }

  private async trackSystemMetrics() {
    // Track system-wide performance trends
    const metrics = await storage.getLatestMetrics();
    
    if (metrics.length === 0) return;

    // Calculate aggregate metrics
    const aggregateMetrics = {
      avgCpuUsage: this.calculateAverage(metrics.map(m => parseFloat(m.cpuUsage))),
      avgMemoryUsage: this.calculateAverage(metrics.map(m => parseFloat(m.memoryUsage))),
      avgDiskUsage: this.calculateAverage(metrics.map(m => parseFloat(m.diskUsage))),
      avgNetworkLatency: this.calculateAverage(
        metrics.map(m => m.networkLatency ? parseFloat(m.networkLatency) : 0)
      ),
      serversMonitored: metrics.length,
    };

    // Identify performance trends
    const performanceStatus = this.assessPerformanceStatus(aggregateMetrics);

    // Create performance tracking audit log
    await storage.createAuditLog({
      agentId: this.id,
      action: "Track System Performance",
      details: `System performance tracking completed. Status: ${performanceStatus.status}`,
      status: "success",
      impact: `Average performance: CPU ${aggregateMetrics.avgCpuUsage.toFixed(1)}%, Memory ${aggregateMetrics.avgMemoryUsage.toFixed(1)}%`,
      metadata: {
        aggregateMetrics,
        performanceStatus,
        timestamp: new Date().toISOString(),
      },
    });

    // Create alerts for performance degradation
    if (performanceStatus.status === "degraded") {
      await this.createPerformanceDegradationAlert(performanceStatus, aggregateMetrics);
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private assessPerformanceStatus(metrics: any): {
    status: "optimal" | "acceptable" | "degraded" | "critical";
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let statusScore = 100;

    if (metrics.avgCpuUsage > 80) {
      issues.push("High average CPU usage across infrastructure");
      recommendations.push("Review CPU-intensive processes");
      statusScore -= 30;
    }

    if (metrics.avgMemoryUsage > 85) {
      issues.push("High average memory usage across infrastructure");
      recommendations.push("Consider memory optimization strategies");
      statusScore -= 25;
    }

    if (metrics.avgDiskUsage > 75) {
      issues.push("High average disk usage across infrastructure");
      recommendations.push("Implement automated cleanup policies");
      statusScore -= 20;
    }

    if (metrics.avgNetworkLatency > 50) {
      issues.push("High network latency detected");
      recommendations.push("Investigate network performance issues");
      statusScore -= 15;
    }

    let status: "optimal" | "acceptable" | "degraded" | "critical";
    if (statusScore >= 90) status = "optimal";
    else if (statusScore >= 70) status = "acceptable";
    else if (statusScore >= 50) status = "degraded";
    else status = "critical";

    return { status, issues, recommendations };
  }

  private async createPerformanceDegradationAlert(performanceStatus: any, metrics: any) {
    // This would typically create a system-wide alert
    // For now, we'll just log it as an audit entry
    await storage.createAuditLog({
      agentId: this.id,
      action: "Performance Degradation Alert",
      details: `System-wide performance degradation detected: ${performanceStatus.issues.join(", ")}`,
      status: "warning",
      impact: "Infrastructure performance monitoring",
      metadata: {
        performanceStatus,
        aggregateMetrics: metrics,
        alertType: "system_performance",
      },
    });

    console.log(`${this.name}: Performance degradation detected - ${performanceStatus.issues.join(", ")}`);
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }
}
