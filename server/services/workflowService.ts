import { storage } from "../storage";
import type { 
  RemediationAction, 
  ApprovalWorkflow, 
  WorkflowStep, 
  InsertApprovalWorkflow, 
  InsertWorkflowStep,
  InsertApprovalHistory,
  User
} from "@shared/schema";
import { wsManager } from "./websocket";

interface WorkflowConfiguration {
  serverCriticality: "low" | "medium" | "high" | "critical";
  riskScore: number;
  environment: string;
  requiredApprovals: number;
  steps: {
    stepType: "basic_approval" | "compliance_check" | "impact_assessment" | "security_review" | "change_board";
    requiredRole: "operator" | "supervisor" | "manager" | "director" | "compliance_officer";
    timeoutHours: number;
    autoEscalate: boolean;
    parallelApproval: boolean;
  }[];
}

export class WorkflowService {
  
  // Determines the appropriate workflow configuration based on remediation action
  private determineWorkflowConfiguration(action: RemediationAction, riskScore: number): WorkflowConfiguration {
    const serverCriticality = this.getServerCriticality(action.hostname || "");
    const environment = action.hostname?.includes("prod") ? "production" : 
                       action.hostname?.includes("staging") ? "staging" : "development";

    // Risk-based workflow determination
    if (riskScore >= 80 || serverCriticality === "critical" || environment === "production") {
      return {
        serverCriticality,
        riskScore,
        environment,
        requiredApprovals: 3,
        steps: [
          {
            stepType: "impact_assessment",
            requiredRole: "supervisor",
            timeoutHours: 2,
            autoEscalate: true,
            parallelApproval: false
          },
          {
            stepType: "security_review",
            requiredRole: "compliance_officer",
            timeoutHours: 4,
            autoEscalate: true,
            parallelApproval: false
          },
          {
            stepType: "change_board",
            requiredRole: "director",
            timeoutHours: 8,
            autoEscalate: false,
            parallelApproval: false
          }
        ]
      };
    } else if (riskScore >= 50 || serverCriticality === "high") {
      return {
        serverCriticality,
        riskScore,
        environment,
        requiredApprovals: 2,
        steps: [
          {
            stepType: "compliance_check",
            requiredRole: "supervisor",
            timeoutHours: 4,
            autoEscalate: true,
            parallelApproval: false
          },
          {
            stepType: "basic_approval",
            requiredRole: "manager",
            timeoutHours: 8,
            autoEscalate: true,
            parallelApproval: false
          }
        ]
      };
    } else {
      return {
        serverCriticality,
        riskScore,
        environment,
        requiredApprovals: 1,
        steps: [
          {
            stepType: "basic_approval",
            requiredRole: "supervisor",
            timeoutHours: 24,
            autoEscalate: false,
            parallelApproval: false
          }
        ]
      };
    }
  }

  private getServerCriticality(hostname: string): "low" | "medium" | "high" | "critical" {
    if (hostname.includes("db") || hostname.includes("database")) return "critical";
    if (hostname.includes("api") || hostname.includes("web")) return "high";
    if (hostname.includes("cache") || hostname.includes("queue")) return "medium";
    return "low";
  }

  // Creates a complete approval workflow for a remediation action
  async createApprovalWorkflow(remediationAction: RemediationAction, riskScore: number): Promise<ApprovalWorkflow> {
    const config = this.determineWorkflowConfiguration(remediationAction, riskScore);
    
    // Create the workflow
    const workflowData: InsertApprovalWorkflow = {
      remediationActionId: remediationAction.id,
      workflowName: `${config.serverCriticality.toUpperCase()}_RISK_${config.environment.toUpperCase()}`,
      riskScore,
      requiredApprovals: config.requiredApprovals,
      currentStep: 1,
      totalSteps: config.steps.length,
      status: "pending",
      metadata: {
        serverCriticality: config.serverCriticality,
        environment: config.environment,
        impactAssessment: this.generateImpactAssessment(remediationAction, config),
        businessJustification: this.generateBusinessJustification(remediationAction)
      }
    };

    const workflow = await storage.createApprovalWorkflow(workflowData);

    // Create workflow steps
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepData: InsertWorkflowStep = {
        workflowId: workflow.id,
        stepNumber: i + 1,
        stepType: step.stepType,
        requiredRole: step.requiredRole,
        status: i === 0 ? "pending" : "pending", // First step is pending, others wait
        assignedTo: await this.findAssignedApprover(step.requiredRole),
        metadata: {
          timeoutHours: step.timeoutHours,
          autoEscalate: step.autoEscalate,
          parallelApproval: step.parallelApproval,
          conditions: this.generateStepConditions(step.stepType, remediationAction)
        }
      };
      
      await storage.createWorkflowStep(stepData);
    }

    // Send real-time notification
    wsManager.broadcast('workflow-created', {
      workflowId: workflow.id,
      remediationActionId: remediationAction.id,
      riskScore,
      requiredApprovals: config.requiredApprovals,
      currentStep: 1,
      totalSteps: config.steps.length
    });

    return workflow;
  }

  private generateImpactAssessment(action: RemediationAction, config: WorkflowConfiguration): string {
    const impacts = [];
    
    if (config.environment === "production") {
      impacts.push("Production environment impact");
    }
    
    if (config.serverCriticality === "critical") {
      impacts.push("Critical server infrastructure");
    }
    
    if (action.estimatedDowntime && action.estimatedDowntime !== "0 minutes") {
      impacts.push(`Estimated downtime: ${action.estimatedDowntime}`);
    }
    
    return impacts.length > 0 ? impacts.join(", ") : "Low impact operation";
  }

  private generateBusinessJustification(action: RemediationAction): string {
    return `Automated remediation required for ${action.actionType || "system issue"}: ${action.description || "No description provided"}`;
  }

  private async findAssignedApprover(requiredRole: string): Promise<string | undefined> {
    // In a real system, this would find available approvers based on role and workload
    // For now, return undefined to allow manual assignment
    return undefined;
  }

  private generateStepConditions(stepType: string, action: RemediationAction): Record<string, any> {
    const conditions: Record<string, any> = {};
    
    switch (stepType) {
      case "impact_assessment":
        conditions.requiresDowntimeAnalysis = action.estimatedDowntime !== "0 minutes";
        conditions.requiresRollbackPlan = true;
        break;
      case "security_review":
        conditions.requiresSecurityScan = true;
        conditions.requiresVulnerabilityCheck = action.actionType?.includes("update") || false;
        break;
      case "change_board":
        conditions.requiresFullDocumentation = true;
        conditions.requiresStakeholderNotification = true;
        break;
      case "compliance_check":
        conditions.requiresComplianceValidation = true;
        conditions.requiresAuditTrail = true;
        break;
      case "basic_approval":
        conditions.requiresManagerApproval = true;
        break;
    }
    
    return conditions;
  }

  // Processes workflow step approval/rejection
  async processStepApproval(
    workflowId: string, 
    stepId: string, 
    action: "approved" | "rejected" | "escalated", 
    approverUserId: string, 
    comments?: string
  ): Promise<{ workflowCompleted: boolean; nextStep?: WorkflowStep }> {
    
    // Record the approval in history
    await storage.createApprovalHistory({
      workflowId,
      stepId,
      action,
      approverUserId,
      comments,
      metadata: {
        ipAddress: "0.0.0.0", // In real system, get from request
        userAgent: "AgentOps Dashboard"
      }
    });

    // Update the step status
    await storage.updateWorkflowStepStatus(stepId, action, approverUserId, comments);

    const workflow = await storage.getApprovalWorkflow(workflowId);
    if (!workflow) throw new Error("Workflow not found");

    if (action === "rejected") {
      // Workflow is rejected, update overall status
      await storage.updateApprovalWorkflowStatus(workflowId, "rejected");
      
      // Update remediation action status
      await storage.updateRemediationStatus(workflow.remediationActionId, "rejected");
      
      wsManager.broadcast('workflow-rejected', {
        workflowId,
        remediationActionId: workflow.remediationActionId,
        approverUserId,
        comments
      });

      return { workflowCompleted: true };
    }

    if (action === "approved") {
      // Check if this was the last step
      if (workflow.currentStep >= workflow.totalSteps) {
        // Workflow is complete
        await storage.updateApprovalWorkflowStatus(workflowId, "approved");
        await storage.updateRemediationStatus(workflow.remediationActionId, "approved");
        
        wsManager.broadcast('workflow-completed', {
          workflowId,
          remediationActionId: workflow.remediationActionId,
          approverUserId
        });

        return { workflowCompleted: true };
      } else {
        // Move to next step
        const nextStepNumber = workflow.currentStep + 1;
        await storage.updateApprovalWorkflowStatus(workflowId, "pending", nextStepNumber);
        
        const nextStep = await storage.getNextPendingStep(workflowId);
        
        wsManager.broadcast('workflow-step-completed', {
          workflowId,
          remediationActionId: workflow.remediationActionId,
          currentStep: nextStepNumber,
          totalSteps: workflow.totalSteps,
          nextStep: nextStep
        });

        return { workflowCompleted: false, nextStep: nextStep || undefined };
      }
    }

    if (action === "escalated") {
      // Escalation logic - for now, just move to next step with escalation flag
      await storage.updateApprovalWorkflowStatus(workflowId, "escalated");
      
      wsManager.broadcast('workflow-escalated', {
        workflowId,
        remediationActionId: workflow.remediationActionId,
        approverUserId,
        comments
      });
    }

    return { workflowCompleted: false };
  }

  // Gets workflow summary with current status
  async getWorkflowSummary(workflowId: string): Promise<{
    workflow: ApprovalWorkflow;
    steps: WorkflowStep[];
    history: any[];
    remediationAction: RemediationAction;
  } | null> {
    const workflow = await storage.getApprovalWorkflow(workflowId);
    if (!workflow) return null;

    const [steps, history] = await Promise.all([
      storage.getWorkflowSteps(workflowId),
      storage.getApprovalHistory(workflowId)
    ]);

    const remediationAction = await storage.getRemediationAction(workflow.remediationActionId);
    if (!remediationAction) return null;

    return {
      workflow,
      steps,
      history,
      remediationAction
    };
  }

  // Gets all pending workflows that need attention
  async getPendingWorkflowsForApproval(userRole: string): Promise<any[]> {
    const allPendingWorkflows = await storage.getPendingWorkflows();
    
    // Filter workflows based on user role and current step requirements
    const userWorkflows = [];
    
    for (const workflow of allPendingWorkflows) {
      const currentStep = workflow.steps.find(step => 
        step.stepNumber === workflow.currentStep && step.status === "pending"
      );
      
      if (currentStep && this.canUserApproveStep(userRole, currentStep.requiredRole)) {
        userWorkflows.push({
          ...workflow,
          currentStep: currentStep
        });
      }
    }
    
    return userWorkflows;
  }

  private canUserApproveStep(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      "operator": 1,
      "supervisor": 2,
      "manager": 3,
      "director": 4,
      "compliance_officer": 3 // Special role with compliance authority
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    // Users can approve if they meet or exceed the required role level
    // Or if they have compliance authority for compliance steps
    return userLevel >= requiredLevel || 
           (userRole === "compliance_officer" && requiredRole === "compliance_officer");
  }

  // Auto-escalation for timed-out workflows
  async processTimeoutEscalations(): Promise<void> {
    // This would run periodically to check for timed-out steps
    // Implementation would check step creation time against timeout hours
    // and automatically escalate if configured to do so
  }
}

export const workflowService = new WorkflowService();