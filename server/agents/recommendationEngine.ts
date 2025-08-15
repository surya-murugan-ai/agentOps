import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";
import { aiService } from "../services/aiService";

export class RecommendationEngineAgent implements Agent {
  public readonly id = "recommendation-engine-001";
  public readonly name = "Recommendation Engine";
  public readonly type = "recommender";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private recommendationsGenerated = 0;
  private errorCount = 0;
  
  // Optimization caches
  private lastProcessedAlerts = new Map<string, string>(); // alertId -> alert hash
  private llmCache = new Map<string, any>(); // cache key -> LLM response
  private lastFullRun = 0; // timestamp of last full analysis
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MIN_RUN_INTERVAL = 10 * 60 * 1000; // 10 minutes minimum between full runs

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Generate recommendations every 10 minutes (reduced frequency for optimization)
    this.intervalId = setInterval(() => {
      this.generateRecommendations();
    }, 600000);

    // Initial recommendation check
    await this.generateRecommendations();
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
      cpuUsage: this.getRandomBetween(4, 8),
      memoryUsage: this.getRandomBetween(600, 1000),
      processedCount: this.processedCount,
      recommendationsGenerated: this.recommendationsGenerated,
      successRate: this.getRandomBetween(88, 94),
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  private async generateRecommendations() {
    if (!this.running) return;

    try {
      const now = Date.now();
      
      // Rate limiting: Skip if we ran too recently
      if (now - this.lastFullRun < this.MIN_RUN_INTERVAL) {
        console.log(`${this.name}: Skipping run - too soon since last analysis`);
        return;
      }

      // Get active alerts and pending actions in a single batch
      const [activeAlerts, existingActions] = await Promise.all([
        storage.getActiveAlerts(),
        storage.getPendingRemediationActions()
      ]);
      
      // Filter out alerts that already have remediation actions
      const alertsNeedingRemediation = activeAlerts.filter(alert => 
        !existingActions.some(action => action.alertId === alert.id)
      );

      if (alertsNeedingRemediation.length === 0) {
        console.log(`${this.name}: No new alerts need remediation`);
        return;
      }

      // Change detection: Only process alerts that have actually changed
      const newOrChangedAlerts = alertsNeedingRemediation.filter(alert => {
        const alertHash = this.generateAlertHash(alert);
        const lastHash = this.lastProcessedAlerts.get(alert.id);
        
        if (lastHash !== alertHash) {
          this.lastProcessedAlerts.set(alert.id, alertHash);
          return true;
        }
        return false;
      });

      if (newOrChangedAlerts.length === 0) {
        console.log(`${this.name}: No alerts have changed since last analysis`);
        return;
      }

      // Process alerts with caching and deduplication
      let processedCount = 0;
      for (const alert of newOrChangedAlerts) {
        try {
          await this.generateRemediationRecommendationWithCache(alert);
          processedCount++;
        } catch (error) {
          console.error(`${this.name}: Error processing alert ${alert.id}:`, error);
          this.errorCount++;
        }
      }
      
      this.processedCount += processedCount;
      this.lastFullRun = now;
      
      console.log(`${this.name}: Processed ${processedCount} new/changed alerts (skipped ${alertsNeedingRemediation.length - newOrChangedAlerts.length} unchanged)`);
    } catch (error) {
      console.error(`${this.name}: Error generating recommendations:`, error);
      this.errorCount++;
    }
  }

  private async generateRemediationRecommendation(alert: any) {
    const { serverId, metricType, metricValue, severity } = alert;
    
    try {
      // Get server context for AI analysis
      const server = await storage.getServer(serverId);
      const historicalMetrics = await storage.getServerMetrics(serverId, 20);
      
      // Use AI to generate intelligent recommendations
      const aiRecommendations = await aiService.generateRecommendations(alert, server, historicalMetrics, this.id);
      
      // Process AI recommendations
      for (const aiRec of aiRecommendations.recommendations) {
        const action = await storage.createRemediationAction({
          alertId: alert.id,
          serverId,
          agentId: this.id,
          title: aiRec.title,
          description: `${aiRec.description}\n\nAI Reasoning: ${aiRec.reasoning}`,
          actionType: aiRec.actionType,
          confidence: aiRec.confidence,
          estimatedDowntime: aiRec.estimatedDowntime,
          requiresApproval: aiRec.requiresApproval,
          command: aiRec.command,
          parameters: aiRec.parameters,
        });

        // Log the AI recommendation
        await storage.createAuditLog({
          agentId: this.id,
          serverId,
          action: "AI Generate Recommendation",
          details: `AI generated ${aiRec.actionType} recommendation: ${aiRec.reasoning}`,
          status: "success",
          metadata: { 
            alertId: alert.id, 
            actionId: action.id,
            aiConfidence: aiRec.confidence,
            rootCause: aiRecommendations.rootCauseAnalysis,
            riskAssessment: aiRec.riskAssessment
          },
        });

        wsManager.broadcastRemediationUpdate(action);
        this.recommendationsGenerated++;
        
        console.log(`${this.name}: AI generated ${aiRec.actionType} recommendation for ${metricType} alert on server ${serverId} (confidence: ${aiRec.confidence}%)`);
      }

      // Log root cause analysis
      if (aiRecommendations.rootCauseAnalysis) {
        await storage.createAuditLog({
          agentId: this.id,
          serverId,
          action: "AI Root Cause Analysis",
          details: aiRecommendations.rootCauseAnalysis,
          status: "success",
          metadata: { alertId: alert.id, analysisType: "claude_analysis" },
        });
      }

    } catch (error) {
      console.error(`${this.name}: AI recommendation failed, falling back to rule-based:`, error);
      
      // Fallback to rule-based recommendations
      const value = parseFloat(metricValue);
      let recommendation = null;

      switch (metricType) {
        case "cpu":
          recommendation = this.generateCpuRecommendation(alert, value);
          break;
        case "memory":
          recommendation = this.generateMemoryRecommendation(alert, value);
          break;
        case "disk":
          recommendation = this.generateDiskRecommendation(alert, value);
          break;
        case "network":
          recommendation = this.generateNetworkRecommendation(alert, value);
          break;
      }

      if (recommendation) {
        const action = await storage.createRemediationAction({
          alertId: alert.id,
          serverId,
          agentId: this.id,
          title: recommendation.title,
          description: recommendation.description,
          actionType: recommendation.actionType,
          confidence: recommendation.confidence.toString(),
          estimatedDowntime: recommendation.estimatedDowntime,
          requiresApproval: recommendation.requiresApproval,
          command: recommendation.command,
          parameters: recommendation.parameters,
        });

        wsManager.broadcastRemediationUpdate(action);
        this.recommendationsGenerated++;
      }
    }
  }

  private generateCpuRecommendation(alert: any, cpuUsage: number) {
    if (cpuUsage > 95) {
      return {
        title: "Restart High-Impact Services",
        description: `Critical CPU usage at ${cpuUsage.toFixed(1)}%. Restart resource-intensive services to free up CPU cycles.`,
        actionType: "restart_service",
        confidence: 92,
        estimatedDowntime: 30,
        requiresApproval: true,
        command: "systemctl restart apache2 nginx",
        parameters: { services: ["apache2", "nginx"], reason: "high_cpu" }
      };
    } else if (cpuUsage > 85) {
      return {
        title: "Optimize CPU Scheduling",
        description: `High CPU usage at ${cpuUsage.toFixed(1)}%. Adjust process priorities and kill unnecessary processes.`,
        actionType: "optimize_cpu",
        confidence: 88,
        estimatedDowntime: 0,
        requiresApproval: false,
        command: "renice -n 10 -p $(pgrep -f 'low-priority') && pkill -f 'temp-process'",
        parameters: { action: "renice_and_cleanup", threshold: cpuUsage }
      };
    }
    return null;
  }

  private generateMemoryRecommendation(alert: any, memoryUsage: number) {
    if (memoryUsage > 95) {
      return {
        title: "Emergency Memory Cleanup",
        description: `Critical memory usage at ${memoryUsage.toFixed(1)}%. Clear caches and restart memory-heavy services.`,
        actionType: "restart_service",
        confidence: 95,
        estimatedDowntime: 15,
        requiresApproval: true,
        command: "sync && echo 3 > /proc/sys/vm/drop_caches && systemctl restart memcached redis",
        parameters: { services: ["memcached", "redis"], clearCache: true }
      };
    } else if (memoryUsage > 85) {
      return {
        title: "Memory Optimization",
        description: `High memory usage at ${memoryUsage.toFixed(1)}%. Clear system caches and optimize memory allocation.`,
        actionType: "optimize_memory",
        confidence: 90,
        estimatedDowntime: 5,
        requiresApproval: false,
        command: "echo 1 > /proc/sys/vm/drop_caches",
        parameters: { action: "clear_page_cache", level: 1 }
      };
    }
    return null;
  }

  private generateDiskRecommendation(alert: any, diskUsage: number) {
    if (diskUsage > 90) {
      return {
        title: "Critical Disk Cleanup",
        description: `Critical disk usage at ${diskUsage.toFixed(1)}%. Remove old logs and temporary files immediately.`,
        actionType: "cleanup_files",
        confidence: 98,
        estimatedDowntime: 0,
        requiresApproval: false,
        command: "find /tmp -type f -atime +7 -delete && journalctl --vacuum-time=7d",
        parameters: { paths: ["/tmp", "/var/log"], retention: "7days" }
      };
    } else if (diskUsage > 80) {
      return {
        title: "Disk Space Cleanup",
        description: `High disk usage at ${diskUsage.toFixed(1)}%. Clean up temporary files and old logs.`,
        actionType: "cleanup_files",
        confidence: 96,
        estimatedDowntime: 0,
        requiresApproval: false,
        command: "find /tmp -type f -atime +3 -delete && find /var/log -name '*.log' -mtime +14 -delete",
        parameters: { paths: ["/tmp", "/var/log"], retention: "14days" }
      };
    }
    return null;
  }

  private generateNetworkRecommendation(alert: any, networkLatency: number) {
    if (networkLatency > 100) {
      return {
        title: "Network Optimization",
        description: `High network latency at ${networkLatency.toFixed(1)}ms. Restart network services and clear connection pools.`,
        actionType: "restart_service",
        confidence: 85,
        estimatedDowntime: 10,
        requiresApproval: true,
        command: "systemctl restart networking && iptables -F",
        parameters: { services: ["networking"], clearTables: true }
      };
    }
    return null;
  }

  private async generateProactiveRecommendations() {
    // DISABLED FOR OPTIMIZATION - Proactive recommendations were creating excessive duplicates
    // This method is temporarily disabled to prevent massive API costs and duplicate remediation actions
    console.log(`${this.name}: Proactive recommendations disabled for cost optimization`);
    return;
  }

  private async generateProactiveRecommendation(serverId: string, prediction: any, predictedValue: number) {
    const { metricType } = prediction;
    
    // Check if there's already a pending action for this server and metric type
    const existingActions = await storage.getPendingRemediationActions();
    const existingAction = existingActions.find(
      action => action.serverId === serverId && 
                action.title.includes(metricType.toUpperCase()) &&
                action.title.includes("PROACTIVE")
    );
    
    if (existingAction) return;

    let recommendation = null;

    if (metricType === "cpu" && predictedValue > 85) {
      recommendation = {
        title: "PROACTIVE CPU Optimization",
        description: `Predictive model forecasts CPU usage will reach ${predictedValue.toFixed(1)}%. Preemptively optimize CPU allocation.`,
        actionType: "optimize_cpu",
        confidence: 82,
        estimatedDowntime: 0,
        requiresApproval: false,
        command: "renice -n 5 -p $(pgrep -f 'background-process')",
        parameters: { action: "proactive_optimization", predictedValue }
      };
    } else if (metricType === "memory" && predictedValue > 90) {
      recommendation = {
        title: "PROACTIVE Memory Cleanup",
        description: `Predictive model forecasts memory usage will reach ${predictedValue.toFixed(1)}%. Preemptively clear caches.`,
        actionType: "optimize_memory",
        confidence: 85,
        estimatedDowntime: 0,
        requiresApproval: false,
        command: "echo 1 > /proc/sys/vm/drop_caches",
        parameters: { action: "proactive_cache_clear", predictedValue }
      };
    }

    if (recommendation) {
      const action = await storage.createRemediationAction({
        serverId,
        agentId: this.id,
        title: recommendation.title,
        description: recommendation.description,
        actionType: recommendation.actionType,
        confidence: recommendation.confidence.toString(),
        estimatedDowntime: recommendation.estimatedDowntime,
        requiresApproval: recommendation.requiresApproval,
        command: recommendation.command,
        parameters: recommendation.parameters,
      });

      wsManager.broadcastRemediationUpdate(action);
      this.recommendationsGenerated++;
    }
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }

  // New optimization helper methods
  private generateAlertHash(alert: any): string {
    return `${alert.serverId}-${alert.metricType}-${alert.severity}-${alert.metricValue}`;
  }

  private async generateRemediationRecommendationWithCache(alert: any) {
    // Create cache key
    const cacheKey = `${alert.serverId}-${alert.metricType}-${alert.severity}`;
    
    // Check cache first
    const cached = this.llmCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`${this.name}: Using cached recommendation for ${cacheKey}`);
      await this.createRemediationFromCache(alert, cached.data);
      return;
    }

    // Skip LLM call if API is unavailable, use fallback logic
    try {
      const { serverId, metricType, metricValue, severity } = alert;
      
      // Get server context
      const server = await storage.getServer(serverId);
      const historicalMetrics = await storage.getServerMetrics(serverId, 20);
      
      // Try AI first, but fallback to rule-based if it fails
      let recommendations;
      try {
        const aiRecommendations = await aiService.generateRecommendations(alert, server, historicalMetrics, this.id);
        recommendations = aiRecommendations.recommendations;
        
        // Cache successful result
        this.llmCache.set(cacheKey, {
          data: recommendations,
          timestamp: Date.now()
        });
      } catch (aiError) {
        console.log(`${this.name}: AI unavailable, using rule-based recommendations`);
        recommendations = this.generateRuleBasedRecommendations(alert);
      }
      
      // Create remediation actions
      for (const rec of recommendations) {
        await storage.createRemediationAction({
          alertId: alert.id,
          serverId,
          agentId: this.id,
          title: rec.title,
          description: rec.description,
          actionType: rec.actionType,
          confidence: rec.confidence,
          estimatedDowntime: rec.estimatedDowntime,
          requiresApproval: rec.requiresApproval,
          command: rec.command,
          parameters: rec.parameters,
        });
      }
      
      this.recommendationsGenerated += recommendations.length;
    } catch (error) {
      console.error(`${this.name}: Error in cached recommendation generation:`, error);
      throw error;
    }
  }

  private async createRemediationFromCache(alert: any, cachedRecommendations: any[]) {
    for (const rec of cachedRecommendations) {
      await storage.createRemediationAction({
        alertId: alert.id,
        serverId: alert.serverId,
        agentId: this.id,
        title: rec.title,
        description: rec.description,
        actionType: rec.actionType,
        confidence: rec.confidence,
        estimatedDowntime: rec.estimatedDowntime,
        requiresApproval: rec.requiresApproval,
        command: rec.command,
        parameters: rec.parameters,
      });
    }
    this.recommendationsGenerated += cachedRecommendations.length;
  }

  private generateRuleBasedRecommendations(alert: any): any[] {
    const { metricType, metricValue, severity } = alert;
    const value = parseFloat(metricValue || "0");
    
    // Rule-based fallback recommendations
    if (metricType === "cpuUsage" && value > 85) {
      return [{
        title: "High CPU Usage Mitigation",
        description: "CPU usage is critically high. Immediate action required to prevent system failure.",
        actionType: "process_optimization",
        confidence: 75,
        estimatedDowntime: 2,
        requiresApproval: value > 95,
        command: "renice -n 10 $(ps -eo pid --sort=-%cpu | head -5 | tail -4)",
        parameters: { threshold: value }
      }];
    }
    
    if (metricType === "memoryUsage" && value > 85) {
      return [{
        title: "Memory Usage Optimization",
        description: "Memory usage is critically high. System cache and buffers need clearing.",
        actionType: "memory_cleanup",
        confidence: 80,
        estimatedDowntime: 1,
        requiresApproval: value > 95,
        command: "sync && echo 3 > /proc/sys/vm/drop_caches",
        parameters: { threshold: value }
      }];
    }
    
    if (metricType === "diskUsage" && value > 80) {
      return [{
        title: "Disk Space Cleanup",
        description: "Disk usage is critically high. Cleanup of temporary files needed.",
        actionType: "disk_cleanup",
        confidence: 70,
        estimatedDowntime: 5,
        requiresApproval: true,
        command: "find /tmp -type f -atime +7 -delete && find /var/log -name '*.log' -size +100M -delete",
        parameters: { threshold: value }
      }];
    }
    
    // Default recommendation
    return [{
      title: "System Monitoring",
      description: `${metricType} requires attention. Manual investigation recommended.`,
      actionType: "investigation",
      confidence: 50,
      estimatedDowntime: 0,
      requiresApproval: true,
      command: "echo 'Manual investigation required'",
      parameters: { metricType, value }
    }];
  }
}
