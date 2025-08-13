import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export class AnomalyDetectorAgent implements Agent {
  public readonly id = "anomaly-detector-001";
  public readonly name = "Anomaly Detector";
  public readonly type = "detector";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private anomaliesDetected = 0;
  private errorCount = 0;

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
      // Get recent metrics for all servers
      const latestMetrics = await storage.getLatestMetrics();
      
      for (const metric of latestMetrics) {
        // Apply different detection methods
        await this.applyThresholdDetection(metric);
        await this.applyStatisticalDetection(metric);
        
        this.processedCount++;
      }

      console.log(`${this.name}: Analyzed ${latestMetrics.length} metric records`);
    } catch (error) {
      console.error(`${this.name}: Error detecting anomalies:`, error);
      this.errorCount++;
    }
  }

  private async applyThresholdDetection(metric: any) {
    const cpuUsage = parseFloat(metric.cpuUsage);
    const memoryUsage = parseFloat(metric.memoryUsage);
    const diskUsage = parseFloat(metric.diskUsage);

    // CPU threshold detection
    if (cpuUsage > 85) {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "cpu",
        cpuUsage,
        85,
        cpuUsage > 95 ? "critical" : "warning",
        "threshold",
        `High CPU usage detected: ${cpuUsage.toFixed(1)}%`
      );
    }

    // Memory threshold detection
    if (memoryUsage > 85) {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "memory",
        memoryUsage,
        85,
        memoryUsage > 95 ? "critical" : "warning",
        "threshold",
        `High memory usage detected: ${memoryUsage.toFixed(1)}%`
      );
    }

    // Disk threshold detection
    if (diskUsage > 80) {
      await this.createAnomalyAndAlert(
        metric.serverId,
        "disk",
        diskUsage,
        80,
        diskUsage > 90 ? "critical" : "warning",
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

    // Create alert if one doesn't already exist for this issue
    const existingAlerts = await storage.getActiveAlerts();
    const existingAlert = existingAlerts.find(
      alert => alert.serverId === serverId && 
               alert.metricType === metricType && 
               alert.status === "active"
    );

    if (!existingAlert) {
      const alert = await storage.createAlert({
        serverId,
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

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }
}
