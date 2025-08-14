import express from "express";
import { workflowService } from "../services/workflowService";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

const router = express.Router();

// Get pending workflows for approval (filtered by user role)
router.get("/pending", async (req, res) => {
  try {
    const userRole = req.query.role as string || "operator";
    const workflows = await workflowService.getPendingWorkflowsForApproval(userRole);
    res.json(workflows);
  } catch (error) {
    console.error("Error fetching pending workflows:", error);
    res.status(500).json({ error: "Failed to fetch pending workflows" });
  }
});

// Get workflow details with history
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workflowSummary = await workflowService.getWorkflowSummary(id);
    
    if (!workflowSummary) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    res.json(workflowSummary);
  } catch (error) {
    console.error("Error fetching workflow details:", error);
    res.status(500).json({ error: "Failed to fetch workflow details" });
  }
});

// Create approval workflow for remediation action
router.post("/create", async (req, res) => {
  try {
    const { remediationActionId, riskScore = 50 } = req.body;
    
    if (!remediationActionId) {
      return res.status(400).json({ error: "remediationActionId is required" });
    }
    
    // Get the remediation action
    const remediationAction = await storage.getRemediationAction(remediationActionId);
    if (!remediationAction) {
      return res.status(404).json({ error: "Remediation action not found" });
    }
    
    // Check if workflow already exists
    const existingWorkflow = await storage.getApprovalWorkflowByRemediationId(remediationActionId);
    if (existingWorkflow) {
      return res.status(409).json({ error: "Workflow already exists for this remediation action" });
    }
    
    // Create workflow
    const workflow = await workflowService.createApprovalWorkflow(remediationAction, riskScore);
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// Process step approval/rejection
router.post("/:workflowId/steps/:stepId/approve", async (req, res) => {
  try {
    const { workflowId, stepId } = req.params;
    const { action, approverUserId, comments } = req.body;
    
    if (!action || !approverUserId) {
      return res.status(400).json({ error: "action and approverUserId are required" });
    }
    
    if (!["approved", "rejected", "escalated"].includes(action)) {
      return res.status(400).json({ error: "action must be approved, rejected, or escalated" });
    }
    
    const result = await workflowService.processStepApproval(
      workflowId, 
      stepId, 
      action, 
      approverUserId, 
      comments
    );
    
    res.json(result);
  } catch (error) {
    console.error("Error processing step approval:", error);
    res.status(500).json({ error: "Failed to process step approval" });
  }
});

// Get workflow history
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const history = await storage.getApprovalHistory(id);
    res.json(history);
  } catch (error) {
    console.error("Error fetching workflow history:", error);
    res.status(500).json({ error: "Failed to fetch workflow history" });
  }
});

// Get workflow steps
router.get("/:id/steps", async (req, res) => {
  try {
    const { id } = req.params;
    const steps = await storage.getWorkflowSteps(id);
    res.json(steps);
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
    res.status(500).json({ error: "Failed to fetch workflow steps" });
  }
});

// Bulk approve/reject workflows (for mass operations)
router.post("/bulk-action", async (req, res) => {
  try {
    const { workflowIds, action, approverUserId, comments } = req.body;
    
    if (!workflowIds || !Array.isArray(workflowIds) || !action || !approverUserId) {
      return res.status(400).json({ error: "workflowIds, action, and approverUserId are required" });
    }
    
    const results = [];
    
    for (const workflowId of workflowIds) {
      try {
        // Get current pending step
        const pendingStep = await storage.getNextPendingStep(workflowId);
        if (pendingStep) {
          const result = await workflowService.processStepApproval(
            workflowId,
            pendingStep.id,
            action,
            approverUserId,
            comments
          );
          results.push({ workflowId, success: true, result });
        } else {
          results.push({ workflowId, success: false, error: "No pending step found" });
        }
      } catch (error) {
        results.push({ workflowId, success: false, error: error.message });
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error("Error processing bulk workflow action:", error);
    res.status(500).json({ error: "Failed to process bulk workflow action" });
  }
});

// Get workflow statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const pendingWorkflows = await storage.getPendingWorkflows();
    
    const stats = {
      total: pendingWorkflows.length,
      byRiskLevel: {
        low: pendingWorkflows.filter(w => w.riskScore < 50).length,
        medium: pendingWorkflows.filter(w => w.riskScore >= 50 && w.riskScore < 80).length,
        high: pendingWorkflows.filter(w => w.riskScore >= 80).length
      },
      byEnvironment: {
        production: pendingWorkflows.filter(w => w.metadata?.environment === "production").length,
        staging: pendingWorkflows.filter(w => w.metadata?.environment === "staging").length,
        development: pendingWorkflows.filter(w => w.metadata?.environment === "development").length
      },
      byServerCriticality: {
        critical: pendingWorkflows.filter(w => w.metadata?.serverCriticality === "critical").length,
        high: pendingWorkflows.filter(w => w.metadata?.serverCriticality === "high").length,
        medium: pendingWorkflows.filter(w => w.metadata?.serverCriticality === "medium").length,
        low: pendingWorkflows.filter(w => w.metadata?.serverCriticality === "low").length
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching workflow statistics:", error);
    res.status(500).json({ error: "Failed to fetch workflow statistics" });
  }
});

// Real-time workflow updates endpoint
router.get("/events", (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = Date.now();
  
  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection confirmation
  sendEvent({ type: 'connected', clientId });

  // Listen for workflow events
  const workflowEventHandler = (eventType: string, data: any) => {
    if (eventType.startsWith('workflow-')) {
      sendEvent({ type: eventType, data });
    }
  };

  wsManager.on('broadcast', workflowEventHandler);

  // Cleanup on client disconnect
  req.on('close', () => {
    wsManager.off('broadcast', workflowEventHandler);
  });
});

export { router as workflowRoutes };