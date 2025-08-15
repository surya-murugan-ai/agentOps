import type { Express } from "express";
import { agentControlService } from "../services/agentControlService";
import { insertAgentControlSettingsSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export function registerAgentControlRoutes(app: Express) {
  // Get agent control settings
  app.get("/api/agents/:agentId/control-settings", async (req, res) => {
    try {
      const { agentId } = req.params;
      const settings = await agentControlService.getAgentControlSettings(agentId);
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await agentControlService.createDefaultControlSettings(agentId);
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error getting agent control settings:", error);
      res.status(500).json({ error: "Failed to get agent control settings" });
    }
  });

  // Update agent control settings
  app.put("/api/agents/:agentId/control-settings", async (req, res) => {
    try {
      const { agentId } = req.params;
      const validation = insertAgentControlSettingsSchema.partial().safeParse({
        ...req.body,
        agentId
      });

      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: fromZodError(validation.error).toString() 
        });
      }

      const updatedSettings = await agentControlService.updateAgentControlSettings(
        agentId, 
        validation.data
      );
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating agent control settings:", error);
      res.status(500).json({ error: "Failed to update agent control settings" });
    }
  });

  // Toggle realtime monitoring
  app.post("/api/agents/:agentId/toggle-monitoring", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      await agentControlService.enableRealtimeMonitoring(agentId, enabled);
      
      res.json({ 
        success: true, 
        message: `Realtime monitoring ${enabled ? 'enabled' : 'disabled'} for agent ${agentId}` 
      });
    } catch (error) {
      console.error("Error toggling agent monitoring:", error);
      res.status(500).json({ error: "Failed to toggle agent monitoring" });
    }
  });

  // Set monitoring frequency
  app.post("/api/agents/:agentId/frequency", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { frequencySeconds } = req.body;

      if (typeof frequencySeconds !== "number" || frequencySeconds < 10) {
        return res.status(400).json({ 
          error: "frequencySeconds must be a number >= 10" 
        });
      }

      await agentControlService.setMonitoringFrequency(agentId, frequencySeconds);
      
      res.json({ 
        success: true, 
        message: `Monitoring frequency set to ${frequencySeconds} seconds for agent ${agentId}` 
      });
    } catch (error) {
      console.error("Error setting monitoring frequency:", error);
      res.status(500).json({ error: "Failed to set monitoring frequency" });
    }
  });

  // Pause agent
  app.post("/api/agents/:agentId/pause", async (req, res) => {
    try {
      const { agentId } = req.params;
      await agentControlService.pauseAgent(agentId);
      
      res.json({ 
        success: true, 
        message: `Agent ${agentId} paused` 
      });
    } catch (error) {
      console.error("Error pausing agent:", error);
      res.status(500).json({ error: "Failed to pause agent" });
    }
  });

  // Resume agent
  app.post("/api/agents/:agentId/resume", async (req, res) => {
    try {
      const { agentId } = req.params;
      await agentControlService.resumeAgent(agentId);
      
      res.json({ 
        success: true, 
        message: `Agent ${agentId} resumed` 
      });
    } catch (error) {
      console.error("Error resuming agent:", error);
      res.status(500).json({ error: "Failed to resume agent" });
    }
  });

  // Restart agent
  app.post("/api/agents/:agentId/restart", async (req, res) => {
    try {
      const { agentId } = req.params;
      await agentControlService.restartAgent(agentId);
      
      res.json({ 
        success: true, 
        message: `Agent ${agentId} restarted` 
      });
    } catch (error) {
      console.error("Error restarting agent:", error);
      res.status(500).json({ error: "Failed to restart agent" });
    }
  });

  // Get all agent control settings
  app.get("/api/agent-control-settings", async (req, res) => {
    try {
      const settings = await agentControlService.getAllAgentControlSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting all agent control settings:", error);
      res.status(500).json({ error: "Failed to get agent control settings" });
    }
  });

  // Agent control dashboard data
  app.get("/api/agent-control/dashboard", async (req, res) => {
    try {
      const [allSettings, agents] = await Promise.all([
        agentControlService.getAllAgentControlSettings(),
        (await import("../storage")).storage.getAllAgents()
      ]);

      const dashboard = {
        totalAgents: agents.length,
        activeMonitoring: allSettings.filter(s => s.realtimeMonitoringEnabled).length,
        inactiveMonitoring: allSettings.filter(s => !s.realtimeMonitoringEnabled).length,
        averageFrequency: allSettings.length > 0 
          ? Math.round(allSettings.reduce((sum, s) => sum + s.monitoringFrequencySeconds, 0) / allSettings.length)
          : 60,
        agentsWithSchedules: allSettings.filter(s => s.operatingSchedule.enabled).length,
        healthyAgents: agents.filter(a => a.status === 'active').length,
        pausedAgents: agents.filter(a => a.status === 'paused').length,
        errorAgents: agents.filter(a => a.status === 'error').length
      };

      res.json(dashboard);
    } catch (error) {
      console.error("Error getting agent control dashboard:", error);
      res.status(500).json({ error: "Failed to get agent control dashboard" });
    }
  });
}