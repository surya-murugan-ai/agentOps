import { Agent, agentManager } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export class RemediationExecutorAgent implements Agent {
  public readonly id = "remediation-executor-001";
  public readonly name = "Remediation Executor";
  public readonly type = "executor";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private actionsExecuted = 0;
  private successfulActions = 0;
  private failedActions = 0;
  private errorCount = 0;

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Check for approved actions every 30 seconds
    this.intervalId = setInterval(() => {
      this.executeApprovedActions();
    }, 30000);

    // Initial check
    await this.executeApprovedActions();
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
    const successRate = this.actionsExecuted > 0 ? 
      ((this.successfulActions / this.actionsExecuted) * 100).toFixed(1) : "0";

    return {
      id: this.id,
      name: this.name,
      status: this.running ? "active" : "inactive",
      cpuUsage: this.getRandomBetween(3, 7),
      memoryUsage: this.getRandomBetween(400, 700),
      processedCount: this.processedCount,
      actionsExecuted: this.actionsExecuted,
      successfulActions: this.successfulActions,
      failedActions: this.failedActions,
      successRate,
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  public async executeAction(actionId: string) {
    try {
      const action = await storage.getRemediationAction(actionId);
      if (!action) {
        console.error(`${this.name}: Action ${actionId} not found`);
        return;
      }

      if (action.status !== "approved") {
        console.error(`${this.name}: Action ${actionId} is not approved for execution`);
        return;
      }

      await this.executeRemediationAction(action);
    } catch (error) {
      console.error(`${this.name}: Error executing action ${actionId}:`, error);
      this.errorCount++;
    }
  }

  private async executeApprovedActions() {
    if (!this.running) return;

    try {
      // Get all approved actions that haven't been executed yet
      const pendingActions = await storage.getPendingRemediationActions();
      const approvedActions = pendingActions.filter(action => action.status === "approved");
      
      for (const action of approvedActions) {
        await this.executeRemediationAction(action);
        this.processedCount++;
      }

      if (approvedActions.length > 0) {
        console.log(`${this.name}: Executed ${approvedActions.length} approved actions`);
        
        // Log execution activity
        await storage.createAuditLog({
          agentId: this.id,
          action: "Remediation Execution",
          details: `Successfully executed ${approvedActions.length} approved remediation actions`,
          status: "success",
          metadata: {
            actionsExecuted: approvedActions.length,
            successfulActions: this.successfulActions,
            failedActions: this.failedActions,
            method: "automated_execution"
          }
        });
      }
    } catch (error) {
      console.error(`${this.name}: Error executing approved actions:`, error);
      this.errorCount++;
    }
  }

  private async executeRemediationAction(action: any) {
    const startTime = new Date();
    
    try {
      // Update status to executing
      await storage.updateRemediationStatus(action.id, "executing");
      
      // Broadcast status update
      wsManager.broadcastRemediationUpdate({
        ...action,
        status: "executing",
        executedAt: startTime
      });

      console.log(`${this.name}: Starting execution of ${action.actionType} on server ${action.serverId}`);

      // Execute the remediation based on action type
      const result = await this.performRemediation(action);
      
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();

      // Update status to completed
      await storage.updateRemediationStatus(action.id, "completed", {
        ...result,
        executionTime,
        completedAt: endTime.toISOString(),
      });

      this.actionsExecuted++;
      this.successfulActions++;

      // Create audit log
      await storage.createAuditLog({
        agentId: this.id,
        serverId: action.serverId,
        action: `Execute ${action.actionType}`,
        details: `Successfully executed ${action.title}`,
        status: "success",
        impact: result.impact,
        metadata: {
          actionId: action.id,
          executionTime,
          result: result.output,
        },
      });

      // Broadcast completion
      wsManager.broadcastRemediationUpdate({
        ...action,
        status: "completed",
        completedAt: endTime,
        result
      });

      // Resolve related alert if applicable
      if (action.alertId) {
        await storage.resolveAlert(action.alertId);
      }

      console.log(`${this.name}: Successfully completed ${action.actionType} on server ${action.serverId} in ${executionTime}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Update status to failed
      await storage.updateRemediationStatus(action.id, "failed", {
        error: errorMessage,
        failedAt: new Date().toISOString(),
      });

      this.actionsExecuted++;
      this.failedActions++;

      // Create audit log for failure
      await storage.createAuditLog({
        agentId: this.id,
        serverId: action.serverId,
        action: `Execute ${action.actionType}`,
        details: `Failed to execute ${action.title}: ${errorMessage}`,
        status: "failed",
        metadata: {
          actionId: action.id,
          error: errorMessage,
        },
      });

      // Broadcast failure
      wsManager.broadcastRemediationUpdate({
        ...action,
        status: "failed",
        result: { error: errorMessage }
      });

      console.error(`${this.name}: Failed to execute ${action.actionType} on server ${action.serverId}: ${errorMessage}`);
    }
  }

  private async performRemediation(action: any): Promise<{
    success: boolean;
    output: string;
    impact: string;
  }> {
    // Simulate execution time
    await this.simulateExecutionTime(action.estimatedDowntime);

    switch (action.actionType) {
      case "restart_service":
        return this.executeServiceRestart(action);
      
      case "cleanup_files":
        return this.executeFileCleanup(action);
      
      case "optimize_memory":
        return this.executeMemoryOptimization(action);
      
      case "optimize_cpu":
        return this.executeCpuOptimization(action);
      
      case "clear_cache":
        return this.executeCacheClearing(action);
      
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  private async executeServiceRestart(action: any): Promise<any> {
    const services = action.parameters?.services || ["unknown-service"];
    const spaceFreed = this.getRandomBetween(50, 200);
    
    return {
      success: true,
      output: `Successfully restarted services: ${services.join(", ")}`,
      impact: `Services restarted, ${spaceFreed}MB memory freed`,
    };
  }

  private async executeFileCleanup(action: any): Promise<any> {
    const paths = action.parameters?.paths || ["/tmp"];
    const spaceFreed = this.getRandomBetween(1000, 5000);
    
    return {
      success: true,
      output: `Cleaned up files in: ${paths.join(", ")}`,
      impact: `${spaceFreed}MB disk space freed`,
    };
  }

  private async executeMemoryOptimization(action: any): Promise<any> {
    const memoryFreed = this.getRandomBetween(500, 1500);
    
    return {
      success: true,
      output: "Memory caches cleared and optimized",
      impact: `${memoryFreed}MB memory freed`,
    };
  }

  private async executeCpuOptimization(action: any): Promise<any> {
    const cpuReduction = this.getRandomBetween(5, 15);
    
    return {
      success: true,
      output: "Process priorities optimized and unnecessary processes terminated",
      impact: `CPU usage reduced by approximately ${cpuReduction}%`,
    };
  }

  private async executeCacheClearing(action: any): Promise<any> {
    const cacheSize = this.getRandomBetween(200, 800);
    
    return {
      success: true,
      output: "System caches cleared",
      impact: `${cacheSize}MB cache cleared`,
    };
  }

  private async simulateExecutionTime(estimatedSeconds: number) {
    // Simulate actual execution time with some variance
    const actualTime = estimatedSeconds * 1000 + Math.random() * 2000;
    return new Promise(resolve => setTimeout(resolve, Math.min(actualTime, 10000))); // Cap at 10 seconds for demo
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(0);
  }
}
