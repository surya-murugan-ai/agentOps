import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";
import { aiService } from "../services/aiService";
import { thresholdConfig } from "../config/thresholds";

export class AnomalyDetectorAgent implements Agent {
  public readonly id = "anomaly-detector-001";
  public readonly name = "Anomaly Detector";
  public readonly type = "detector";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private anomaliesDetected = 0;
  private errorCount = 0;
  
  // Alert management limits - Balanced circuit breaker protection
  private readonly MAX_ALERTS_PER_SERVER = 3;  // Allow 3 per server for better coverage
  private readonly MAX_TOTAL_ALERTS = 15;      // Increased to 15 total to catch critical issues

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Check for anomalies every 60 seconds
    this.intervalId = setInterval(() => {
      this.detectAnomalies();
    }, 60000);

    // Initial detection
    await this.detectAnomalies();
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
      cpuUsage: this.getRandomBetween(6, 12),
      memoryUsage: this.getRandomBetween(800, 1400),
      processedCount: this.processedCount,
      anomaliesDetected: this.anomaliesDetected,
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  private async detectAnomalies() {
    if (!this.running) return;

    try {
      // PRODUCTION SOLUTION: Intelligent alert management instead of stopping detection
      await this.manageAlertOverflow();
      
      const existingAlerts = await storage.getActiveAlerts();
      if (existingAlerts.length >= this.MAX_TOTAL_ALERTS) {
        console.log(`${this.name}: Alert limit reached (${existingAlerts.length}/${this.MAX_TOTAL_ALERTS}) - Using CRITICAL-ONLY mode`);
        // Continue with CRITICAL-only detection instead of stopping completely
        return await this.criticalOnlyDetection();
      }

      // Clean up old resolved alerts first to prevent accumulation
      await this.cleanupOldAlerts();

      // Get recent metrics for all servers
      const latestMetrics = await storage.getLatestMetrics();
      
      // Get historical data for AI analysis
      const historicalData = await storage.getAllMetrics(200); // Last 200 readings
      
      // Use AI for intelligent anomaly detection only when necessary (expensive API calls)
      try {
        // Double-check limit before AI analysis
        const preAIAlerts = await storage.getActiveAlerts();
        if (preAIAlerts.length >= this.MAX_TOTAL_ALERTS) {
          console.log(`${this.name}: Skipping AI analysis - alert limit reached`);
          return;
        }

        // OPTIMIZATION: Only run AI analysis if metrics have changed significantly 
        const shouldRunAI = await this.shouldRunAIAnalysis(latestMetrics);
        if (!shouldRunAI) {
          console.log(`${this.name}: Metrics stable, skipping expensive AI analysis to save API costs`);
          return;
        }

        console.log(`${this.name}: Running AI analysis due to significant metric changes`);
        const aiAnalysis = await aiService.analyzeAnomalies(latestMetrics, historicalData, this.id);
        
        // Process AI-detected anomalies with per-anomaly limit checking
        for (const anomaly of aiAnalysis.anomalies) {
          const currentAlerts = await storage.getActiveAlerts();
          if (currentAlerts.length >= this.MAX_TOTAL_ALERTS) {
            console.log(`${this.name}: Global limit reached while processing AI anomalies, stopping`);
            break;
          }
          await this.createAIAnomaly(anomaly);
          this.anomaliesDetected++;
        }

        console.log(`${this.name}: AI analyzed ${latestMetrics.length} metrics, found ${aiAnalysis.anomalies.length} anomalies`);
        if (aiAnalysis.insights) {
          console.log(`${this.name}: AI Insights: ${aiAnalysis.insights}`);
        }
        
        // Record that we completed AI analysis
        this.recordAIAnalysis(latestMetrics);
      } catch (aiError) {
        console.log(`${this.name}: AI analysis unavailable, using threshold detection only`);
        // Continue with threshold detection even if AI fails
      }

      // Also run traditional threshold detection as backup with limit checking
      for (const metric of latestMetrics) {
        const currentAlerts = await storage.getActiveAlerts();
        if (currentAlerts.length >= this.MAX_TOTAL_ALERTS) {
          console.log(`${this.name}: Global limit reached during threshold detection, stopping`);
          break;
        }
        await this.applyThresholdDetection(metric);
        this.processedCount++;
      }

    } catch (error) {
      console.error(`${this.name}: Error detecting anomalies:`, error);
      this.errorCount++;
    }
  }

  private async applyThresholdDetection(metric: any) {
    const cpuUsage = parseFloat(metric.cpuUsage);
    const memoryUsage = parseFloat(metric.memoryUsage);
    const diskUsage = parseFloat(metric.diskUsage);

    // Get server environment for threshold configuration
    const server = await storage.getServer(metric.serverId);
    const environment = server?.environment || 'default';

    // CPU threshold detection using configurable thresholds
    const cpuCheck = thresholdConfig.checkThreshold('cpu', cpuUsage, environment);
    if (cpuCheck.severity !== 'normal') {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "cpu",
        cpuUsage,
        cpuCheck.threshold,
        cpuCheck.severity as "warning" | "critical",
        "threshold",
        `High CPU usage detected: ${cpuUsage.toFixed(1)}%`
      );
    }

    // Memory threshold detection using configurable thresholds
    const memoryCheck = thresholdConfig.checkThreshold('memory', memoryUsage, environment);
    if (memoryCheck.severity !== 'normal') {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "memory",
        memoryUsage,
        memoryCheck.threshold,
        memoryCheck.severity as "warning" | "critical",
        "threshold",
        `High memory usage detected: ${memoryUsage.toFixed(1)}%`
      );
    }

    // Disk threshold detection using configurable thresholds
    const diskCheck = thresholdConfig.checkThreshold('disk', diskUsage, environment);
    if (diskCheck.severity !== 'normal') {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "disk",
        diskUsage,
        diskCheck.threshold,
        diskCheck.severity as "warning" | "critical",
        "threshold",
        `High disk usage detected: ${diskUsage.toFixed(1)}%`
      );
    }
  }

  private async applyStatisticalDetection(metric: any) {
    // Get historical data for this server
    const historicalMetrics = await storage.getServerMetrics(metric.serverId, 50);
    
    if (historicalMetrics.length < 10) return; // Need enough data for statistical analysis

    // Calculate moving averages and standard deviations
    const cpuValues = historicalMetrics.map(m => parseFloat(m.cpuUsage));
    const memoryValues = historicalMetrics.map(m => parseFloat(m.memoryUsage));
    
    const cpuAvg = cpuValues.reduce((a, b) => a + b) / cpuValues.length;
    const memoryAvg = memoryValues.reduce((a, b) => a + b) / memoryValues.length;
    
    const cpuStdDev = Math.sqrt(cpuValues.reduce((sq, n) => sq + Math.pow(n - cpuAvg, 2), 0) / cpuValues.length);
    const memoryStdDev = Math.sqrt(memoryValues.reduce((sq, n) => sq + Math.pow(n - memoryAvg, 2), 0) / memoryValues.length);

    const currentCpu = parseFloat(metric.cpuUsage);
    const currentMemory = parseFloat(metric.memoryUsage);

    // Detect anomalies using 2-sigma rule
    const cpuDeviationScore = Math.abs(currentCpu - cpuAvg) / cpuStdDev;
    const memoryDeviationScore = Math.abs(currentMemory - memoryAvg) / memoryStdDev;

    if (cpuDeviationScore > 2) {
      await this.createAnomaly(
        metric.serverId,
        "cpu",
        currentCpu,
        cpuAvg,
        cpuDeviationScore,
        cpuDeviationScore > 3 ? "critical" : "warning",
        "statistical"
      );
    }

    if (memoryDeviationScore > 2) {
      await this.createAnomaly(
        metric.serverId,
        "memory",
        currentMemory,
        memoryAvg,
        memoryDeviationScore,
        memoryDeviationScore > 3 ? "critical" : "warning",
        "statistical"
      );
    }
  }

  private async createAnomalyAndAlert(
    serverId: string,
    metricType: string,
    actualValue: number,
    threshold: number,
    severity: "warning" | "critical",
    detectionMethod: string,
    description: string
  ) {
    // Create anomaly record
    await this.createAnomaly(
      serverId,
      metricType,
      actualValue,
      threshold,
      ((actualValue - threshold) / threshold) * 100,
      severity,
      detectionMethod
    );

    // Enhanced deduplication and alert limits
    const existingAlerts = await storage.getActiveAlerts();
    
    // Check global alert limit
    if (existingAlerts.length >= this.MAX_TOTAL_ALERTS) {
      console.log(`${this.name}: Global alert limit reached (${this.MAX_TOTAL_ALERTS}), skipping new alert`);
      return;
    }
    
    // Check per-server alert limit
    const serverAlerts = existingAlerts.filter(alert => alert.serverId === serverId);
    if (serverAlerts.length >= this.MAX_ALERTS_PER_SERVER) {
      console.log(`${this.name}: Server alert limit reached for ${serverId} (${this.MAX_ALERTS_PER_SERVER}), skipping new alert`);
      return;
    }
    
    // PRODUCTION: Enhanced deduplication check with multiple conditions
    const existingAlert = existingAlerts.find(
      alert => alert.serverId === serverId && 
               alert.metricType === metricType && 
               alert.status === "active" &&
               alert.agentId === this.id // Ensure it's from this agent
    );
    
    // Additional check for similar alerts from other agents to prevent cross-agent duplicates
    const similarAlert = existingAlerts.find(
      alert => alert.serverId === serverId && 
               alert.metricType === metricType && 
               alert.status === "active" &&
               alert.severity === severity // Same severity level
    );

    if (!existingAlert && !similarAlert) {
      // Get server info to include hostname
      const server = await storage.getServer(serverId);
      const alert = await storage.createAlert({
        serverId,
        hostname: server?.hostname || serverId,
        agentId: this.id,
        title: `${metricType.toUpperCase()} ${severity.toUpperCase()}`,
        description,
        severity: severity as any,
        metricType,
        metricValue: actualValue.toString(),
        threshold: threshold.toString(),
      });

      // Broadcast new alert
      wsManager.broadcastAlert(alert);
      
      console.log(`${this.name}: Created ${severity} alert for ${metricType} on server ${serverId}`);
    } else if (existingAlert) {
      // Update existing alert if severity has changed
      if (existingAlert.severity !== severity) {
        await storage.updateAlert(existingAlert.id, {
          severity: severity as any,
          metricValue: actualValue.toString(),
          description,
          updatedAt: new Date()
        });
        console.log(`${this.name}: Updated ${existingAlert.severity} to ${severity} alert for ${metricType} on server ${serverId}`);
      } else {
        console.log(`${this.name}: Skipping duplicate alert for ${metricType} on server ${serverId}`);
      }
    } else if (similarAlert) {
      console.log(`${this.name}: Skipping similar alert from another agent for ${metricType} on server ${serverId}`);
    }
  }

  private async createAnomaly(
    serverId: string,
    metricType: string,
    actualValue: number,
    expectedValue: number,
    deviationScore: number,
    severity: "warning" | "critical",
    detectionMethod: string
  ) {
    await storage.createAnomaly({
      serverId,
      agentId: this.id,
      metricType,
      actualValue: actualValue.toString(),
      expectedValue: expectedValue.toString(),
      deviationScore: deviationScore.toString(),
      severity: severity as any,
      detectionMethod,
    });

    this.anomaliesDetected++;
  }

  private mapSeverity(aiSeverity: string): "info" | "warning" | "critical" {
    switch (aiSeverity.toLowerCase()) {
      case "low":
      case "info":
        return "info";
      case "medium":
      case "warning":
        return "warning";
      case "high":
      case "critical":
        return "critical";
      default:
        return "warning";
    }
  }

  private async createAIAnomaly(anomaly: any) {
    try {
      const mappedSeverity = this.mapSeverity(anomaly.severity);
      
      // Enhanced AI alert deduplication and limits
      const existingAlerts = await storage.getActiveAlerts();
      
      // Check global alert limit
      if (existingAlerts.length >= this.MAX_TOTAL_ALERTS) {
        console.log(`${this.name}: Global alert limit reached, skipping AI alert`);
        return;
      }
      
      // Check per-server alert limit
      const serverAlerts = existingAlerts.filter(alert => alert.serverId === anomaly.serverId);
      if (serverAlerts.length >= this.MAX_ALERTS_PER_SERVER) {
        console.log(`${this.name}: Server alert limit reached for ${anomaly.serverId}, skipping AI alert`);
        return;
      }
      
      // Check for existing alert with same server + metric combination
      const existingAlert = existingAlerts.find(
        alert => alert.serverId === anomaly.serverId && 
                 alert.metricType === anomaly.metricType && 
                 alert.status === "active"
      );

      if (existingAlert) {
        console.log(`${this.name}: Skipping duplicate AI alert for ${anomaly.metricType} on server ${anomaly.serverId}`);
        return;
      }

      // Get proper threshold values for this metric type
      const server = await storage.getServer(anomaly.serverId);
      const environment = server?.environment || 'default';
      const thresholds = thresholdConfig.getThresholds(environment);
      
      let thresholdValue = 0;
      let actualValue = 0;
      
      // Get the appropriate threshold based on metric type
      switch (anomaly.metricType.toLowerCase()) {
        case 'cpu':
          thresholdValue = mappedSeverity === 'critical' ? thresholds.cpu.critical : thresholds.cpu.warning;
          break;
        case 'memory':
          thresholdValue = mappedSeverity === 'critical' ? thresholds.memory.critical : thresholds.memory.warning;
          break;
        case 'disk':
          thresholdValue = mappedSeverity === 'critical' ? thresholds.disk.critical : thresholds.disk.warning;
          break;
        default:
          thresholdValue = 80; // Default threshold
      }
      
      // Try to get actual metric value from recent metrics
      const recentMetrics = await storage.getServerMetrics(anomaly.serverId, 1);
      if (recentMetrics.length > 0) {
        const latestMetric = recentMetrics[0];
        switch (anomaly.metricType.toLowerCase()) {
          case 'cpu':
            actualValue = parseFloat(latestMetric.cpuUsage || '0');
            break;
          case 'memory':
            actualValue = parseFloat(latestMetric.memoryUsage || '0');
            break;
          case 'disk':
            actualValue = parseFloat(latestMetric.diskUsage || '0');
            break;
        }
      }

      // Create anomaly record
      await storage.createAnomaly({
        serverId: anomaly.serverId,
        agentId: this.id,
        metricType: anomaly.metricType,
        actualValue: actualValue.toString(),
        expectedValue: thresholdValue.toString(), 
        deviationScore: anomaly.confidence.toString(),
        severity: mappedSeverity,
        detectionMethod: "ai_analysis",
      });

      // Create corresponding alert
      const alert = await storage.createAlert({
        serverId: anomaly.serverId,
        hostname: server?.hostname || anomaly.serverId,
        agentId: this.id,
        title: `AI Detected ${anomaly.metricType.toUpperCase()} Anomaly`,
        description: anomaly.description,
        severity: mappedSeverity,
        metricType: anomaly.metricType,
        metricValue: actualValue.toString(),
        threshold: thresholdValue.toString(),
      });

      // Broadcast new alert
      wsManager.broadcastAlert(alert);

      // Log the AI detection
      await storage.createAuditLog({
        agentId: this.id,
        serverId: anomaly.serverId,
        action: "AI Anomaly Detection",
        details: `${anomaly.reasoning}`,
        status: "success",
        metadata: { 
          confidence: anomaly.confidence,
          aiMethod: "openai_analysis"
        },
      });

      console.log(`${this.name}: AI detected ${anomaly.severity} anomaly on server ${anomaly.serverId}: ${anomaly.description}`);
    } catch (error) {
      console.error(`${this.name}: Error creating AI anomaly:`, error);
    }
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }

  private lastAIAnalysisHash: string = '';
  private lastAIAnalysisTime: Date = new Date(0);

  private async shouldRunAIAnalysis(currentMetrics: any[]): Promise<boolean> {
    // Don't run AI more than once every 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (this.lastAIAnalysisTime > fifteenMinutesAgo) {
      return false;
    }

    // Create a hash of current metric values to detect changes
    const metricsHash = this.createMetricsHash(currentMetrics);
    
    // Compare with last analysis hash
    if (metricsHash === this.lastAIAnalysisHash) {
      return false; // No significant changes
    }

    // Check if there are any obvious anomalies that warrant AI analysis
    const hasSignificantAnomaly = await this.hasSignificantAnomaly(currentMetrics);
    
    return hasSignificantAnomaly;
  }

  private createMetricsHash(metrics: any[]): string {
    // Create a simple hash based on rounded metric values
    const hashData = metrics.map(m => ({
      cpu: Math.round(parseFloat(m.cpuUsage || '0') / 5) * 5, // Round to nearest 5%
      mem: Math.round(parseFloat(m.memoryUsage || '0') / 5) * 5,
      disk: Math.round(parseFloat(m.diskUsage || '0') / 5) * 5
    }));
    
    return JSON.stringify(hashData);
  }

  private async hasSignificantAnomaly(metrics: any[]): Promise<boolean> {
    // Check if any metric exceeds basic thresholds that would warrant AI analysis
    for (const metric of metrics) {
      const cpu = parseFloat(metric.cpuUsage || '0');
      const memory = parseFloat(metric.memoryUsage || '0');
      const disk = parseFloat(metric.diskUsage || '0');
      
      // Only run AI if we have concerning values
      if (cpu > 80 || memory > 85 || disk > 90) {
        return true;
      }
    }
    return false;
  }

  private recordAIAnalysis(metrics: any[]): void {
    this.lastAIAnalysisTime = new Date();
    this.lastAIAnalysisHash = this.createMetricsHash(metrics);
  }

  private async cleanupOldAlerts() {
    try {
      // Auto-resolve alerts that are no longer relevant (metrics have returned to normal)
      const activeAlerts = await storage.getActiveAlerts();
      const latestMetrics = await storage.getLatestMetrics();
      
      for (const alert of activeAlerts) {
        if (alert.agentId === this.id && alert.metricType) {
          // Find current metric for this server and type
          const currentMetric = latestMetrics.find(m => m.serverId === alert.serverId);
          if (currentMetric) {
            const currentValue = parseFloat(currentMetric[alert.metricType as keyof typeof currentMetric] as string || "0");
            const threshold = parseFloat(alert.threshold || "0");
            
            // If metric has returned to normal levels, auto-resolve the alert
            let shouldResolve = false;
            if (alert.metricType === "cpuUsage" && currentValue < 80) {
              shouldResolve = true;
            } else if (alert.metricType === "memoryUsage" && currentValue < 80) {
              shouldResolve = true;
            } else if (alert.metricType === "diskUsage" && currentValue < 75) {
              shouldResolve = true;
            }
            
            if (shouldResolve) {
              await storage.resolveAlert(alert.id, "system");
              console.log(`${this.name}: Auto-resolved alert ${alert.id} - ${alert.metricType} returned to normal`);
            }
          }
        }
      }
      
      // Also clean up very old alerts (older than 24 hours) that are still active
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const alert of activeAlerts) {
        if (alert.createdAt < oneDayAgo) {
          await storage.resolveAlert(alert.id, "system");
          console.log(`${this.name}: Auto-resolved old alert ${alert.id} - created over 24 hours ago`);
        }
      }
    } catch (error) {
      console.error(`${this.name}: Error cleaning up old alerts:`, error);
    }
  }

  // PRODUCTION: Intelligent alert overflow management
  private async manageAlertOverflow(): Promise<void> {
    const activeAlerts = await storage.getActiveAlerts();
    
    if (activeAlerts.length >= this.MAX_TOTAL_ALERTS * 0.8) { // 80% threshold
      console.log(`${this.name}: Alert volume high (${activeAlerts.length}/${this.MAX_TOTAL_ALERTS}) - Auto-resolving old alerts`);
      
      // 1. Auto-resolve old warning alerts (keep critical)
      const oldWarningAlerts = activeAlerts
        .filter(alert => 
          alert.severity === 'warning' && 
          alert.createdAt < new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours old
        )
        .slice(0, 3); // Resolve up to 3 old warnings
        
      for (const alert of oldWarningAlerts) {
        await storage.resolveAlert(alert.id);
        console.log(`${this.name}: Auto-resolved old warning alert: ${alert.title}`);
      }
      
      // 2. If still too many, resolve oldest non-critical alerts
      const currentAlerts = await storage.getActiveAlerts();
      if (currentAlerts.length >= this.MAX_TOTAL_ALERTS * 0.9) {
        const oldAlerts = currentAlerts
          .filter(alert => alert.severity !== 'critical')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(0, 2); // Resolve 2 oldest non-critical
          
        for (const alert of oldAlerts) {
          await storage.resolveAlert(alert.id);
          console.log(`${this.name}: Auto-resolved old alert to prevent overflow: ${alert.title}`);
        }
      }
    }
  }

  // PRODUCTION: Critical-only detection when at alert limit
  private async criticalOnlyDetection(): Promise<void> {
    console.log(`${this.name}: CRITICAL-ONLY MODE: Monitoring for severe issues only`);
    
    const latestMetrics = await storage.getLatestMetrics();
    
    for (const metric of latestMetrics) {
      // Only create alerts for CRITICAL thresholds
      if (metric.cpuUsage > 95) {
        await this.createCriticalAlert(metric.serverId, 'cpu', metric.cpuUsage, 
          'CRITICAL CPU OVERLOAD - Immediate attention required');
      }
      
      if (metric.memoryUsage > 95) {
        await this.createCriticalAlert(metric.serverId, 'memory', metric.memoryUsage, 
          'CRITICAL MEMORY EXHAUSTION - System at risk');
      }
      
      if (metric.diskUsage > 95) {
        await this.createCriticalAlert(metric.serverId, 'disk', metric.diskUsage, 
          'CRITICAL DISK FULL - Storage emergency');
      }
    }
  }

  private async createCriticalAlert(serverId: string, type: string, value: number, description: string): Promise<void> {
    // Check if we already have a critical alert for this server/type
    const existingAlerts = await storage.getActiveAlerts();
    const existingCritical = existingAlerts.filter(alert => alert.serverId === serverId);
    const hasCritical = existingCritical.some(alert => 
      alert.metricType === type && alert.severity === 'critical'
    );
    
    if (!hasCritical) {
      await storage.createAlert({
        serverId,
        agentId: this.id,
        title: `CRITICAL ${type.toUpperCase()} EMERGENCY`,
        description,
        severity: "critical" as const,
        status: "active" as const,
        metricType: type,
        metricValue: value.toString(),
        threshold: "95.0"
      });
      
      console.log(`${this.name}: CRITICAL ALERT created for ${type} on server ${serverId}: ${value}%`);
    }
  }
}
