import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export class ApprovalComplianceAgent implements Agent {
  public readonly id = "approval-compliance-001";
  public readonly name = "Approval & Compliance";
  public readonly type = "approval";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private approvalsProcessed = 0;
  private complianceChecks = 0;
  private errorCount = 0;

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Check for approval workflows every minute
    this.intervalId = setInterval(() => {
      this.processApprovalWorkflows();
    }, 60000);

    // Initial check
    await this.processApprovalWorkflows();
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
      cpuUsage: this.getRandomBetween(2, 5),
      memoryUsage: this.getRandomBetween(200, 350),
      processedCount: this.processedCount,
      approvalsProcessed: this.approvalsProcessed,
      complianceChecks: this.complianceChecks,
      pendingApprovals: 0,
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  private async processApprovalWorkflows() {
    if (!this.running) return;

    try {
      // Get all pending remediation actions
      const pendingActions = await storage.getPendingRemediationActions();
      
      for (const action of pendingActions) {
        await this.evaluateComplianceAndApproval(action);
        this.processedCount++;
      }

      console.log(`${this.name}: Processed ${pendingActions.length} pending actions`);
    } catch (error) {
      console.error(`${this.name}: Error processing approval workflows:`, error);
      this.errorCount++;
    }
  }

  private async evaluateComplianceAndApproval(action: any) {
    // Perform compliance checks
    const complianceResult = await this.performComplianceCheck(action);
    this.complianceChecks++;

    // Determine if auto-approval is possible
    const autoApprovalEligible = this.checkAutoApprovalEligibility(action, complianceResult);

    if (autoApprovalEligible && !action.requiresApproval) {
      // Auto-approve the action
      await this.autoApproveAction(action);
    } else {
      // Route for manual approval if needed
      await this.routeForManualApproval(action, complianceResult);
    }

    // Log compliance check
    await storage.createAuditLog({
      agentId: this.id,
      serverId: action.serverId,
      action: "Compliance Check",
      details: `Performed compliance evaluation for ${action.actionType} action`,
      status: complianceResult.passed ? "success" : "warning",
      metadata: {
        actionId: action.id,
        complianceScore: complianceResult.score,
        autoApprovalEligible,
      },
    });
  }

  private async performComplianceCheck(action: any): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check action type compliance
    if (!this.isActionTypeCompliant(action.actionType)) {
      issues.push("Action type not in approved list");
      score -= 30;
    }

    // Check confidence threshold
    const confidence = parseFloat(action.confidence);
    if (confidence < 80) {
      issues.push("Confidence level below required threshold");
      score -= 20;
      recommendations.push("Require manual review for low confidence actions");
    }

    // Check estimated downtime
    if (action.estimatedDowntime > 60) {
      issues.push("Estimated downtime exceeds policy limit");
      score -= 25;
      recommendations.push("Consider alternative solutions with lower downtime");
    }

    // Check if action affects critical systems
    if (await this.isCriticalSystem(action.serverId)) {
      issues.push("Action affects critical system");
      score -= 15;
      recommendations.push("Require additional approval for critical systems");
    }

    // Check command safety
    if (action.command && this.containsRiskyCommands(action.command)) {
      issues.push("Command contains potentially risky operations");
      score -= 20;
      recommendations.push("Review command for security implications");
    }

    // Check time-based constraints
    const currentHour = new Date().getHours();
    if (currentHour >= 17 || currentHour <= 6) {
      // After hours - require approval
      score -= 10;
      recommendations.push("After-hours execution requires approval");
    }

    return {
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  private checkAutoApprovalEligibility(action: any, complianceResult: any): boolean {
    // Auto-approval criteria
    const criteria = [
      complianceResult.passed,
      parseFloat(action.confidence) >= 85,
      action.estimatedDowntime <= 30,
      !action.requiresApproval,
      this.isLowRiskAction(action.actionType),
    ];

    return criteria.every(criterion => criterion === true);
  }

  private async autoApproveAction(action: any) {
    // Create a system user for auto-approvals if needed
    const systemUserId = "system-auto-approval";

    await storage.approveRemediationAction(action.id, systemUserId);
    this.approvalsProcessed++;

    // Log auto-approval
    await storage.createAuditLog({
      agentId: this.id,
      serverId: action.serverId,
      userId: systemUserId,
      action: "Auto-Approve Remediation",
      details: `Auto-approved ${action.actionType} action based on compliance criteria`,
      status: "success",
      metadata: {
        actionId: action.id,
        approvalType: "automatic",
        reason: "meets_auto_approval_criteria",
      },
    });

    console.log(`${this.name}: Auto-approved action ${action.id} for ${action.actionType}`);
  }

  private async routeForManualApproval(action: any, complianceResult: any) {
    // Update the action with compliance information
    const metadata = {
      complianceResult,
      routedForApproval: new Date(),
      urgency: this.calculateUrgency(action),
    };

    // In a real system, this would send notifications to appropriate personnel
    console.log(`${this.name}: Routed action ${action.id} for manual approval - Score: ${complianceResult.score}`);

    // Log routing decision
    await storage.createAuditLog({
      agentId: this.id,
      serverId: action.serverId,
      action: "Route for Manual Approval",
      details: `Routed ${action.actionType} action for manual approval due to compliance requirements`,
      status: "pending",
      metadata: {
        actionId: action.id,
        complianceScore: complianceResult.score,
        issues: complianceResult.issues,
      },
    });
  }

  private isActionTypeCompliant(actionType: string): boolean {
    const approvedActions = [
      "restart_service",
      "cleanup_files",
      "optimize_memory",
      "optimize_cpu",
      "clear_cache",
    ];
    return approvedActions.includes(actionType);
  }

  private async isCriticalSystem(serverId: string): Promise<boolean> {
    const server = await storage.getServer(serverId);
    if (!server) return false;

    // Check if server is in production environment or has critical tags
    return server.environment === "prod" || 
           (server.tags && server.tags.includes("critical"));
  }

  private containsRiskyCommands(command: string): boolean {
    const riskyPatterns = [
      "rm -rf",
      "format",
      "mkfs",
      "dd if=",
      "shutdown",
      "reboot",
      "init 0",
      "init 6",
      "chmod 777",
      "chown root",
    ];

    return riskyPatterns.some(pattern => command.toLowerCase().includes(pattern));
  }

  private isLowRiskAction(actionType: string): boolean {
    const lowRiskActions = [
      "cleanup_files",
      "optimize_memory",
      "clear_cache",
    ];
    return lowRiskActions.includes(actionType);
  }

  private calculateUrgency(action: any): "low" | "medium" | "high" {
    const confidence = parseFloat(action.confidence);
    const downtime = action.estimatedDowntime;

    if (confidence >= 95 && downtime <= 10) return "high";
    if (confidence >= 85 && downtime <= 30) return "medium";
    return "low";
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }
}
