import { storage } from "../storage";
import { wsManager } from "./websocket";
import type { AgentControlSettings, InsertAgentControlSettings, Agent } from "@shared/schema";

export class AgentControlService {
  private agentConfigCache = new Map<string, AgentControlSettings>();
  private monitoringIntervals = new Map<string, NodeJS.Timeout>();

  async getAgentControlSettings(agentId: string): Promise<AgentControlSettings | null> {
    // Check cache first
    if (this.agentConfigCache.has(agentId)) {
      return this.agentConfigCache.get(agentId)!;
    }

    // Load from database
    const settings = await storage.getAgentControlSettings(agentId);
    if (settings) {
      this.agentConfigCache.set(agentId, settings);
    }
    return settings;
  }

  async updateAgentControlSettings(
    agentId: string, 
    settings: Partial<InsertAgentControlSettings>
  ): Promise<AgentControlSettings> {
    const updatedSettings = await storage.updateAgentControlSettings(agentId, settings);
    
    // Update cache
    this.agentConfigCache.set(agentId, updatedSettings);
    
    // Apply new settings immediately
    await this.applyControlSettings(agentId, updatedSettings);
    
    // Notify clients of settings change
    wsManager.broadcast({
      type: 'agent_control_updated',
      data: { agentId, settings: updatedSettings }
    });

    return updatedSettings;
  }

  async createDefaultControlSettings(agentId: string): Promise<AgentControlSettings> {
    const defaultSettings: InsertAgentControlSettings = {
      agentId,
      realtimeMonitoringEnabled: true,
      monitoringFrequencySeconds: 60,
      autoRestartEnabled: true,
      maxRetries: 3,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 1000,
        errorRate: 5,
        responseTime: 5000
      },
      operatingSchedule: {
        enabled: false,
        timezone: "UTC",
        schedule: []
      }
    };

    return await storage.createAgentControlSettings(defaultSettings);
  }

  async enableRealtimeMonitoring(agentId: string, enabled: boolean): Promise<void> {
    await this.updateAgentControlSettings(agentId, { 
      realtimeMonitoringEnabled: enabled 
    });
  }

  async setMonitoringFrequency(agentId: string, frequencySeconds: number): Promise<void> {
    await this.updateAgentControlSettings(agentId, { 
      monitoringFrequencySeconds: frequencySeconds 
    });
  }

  async applyControlSettings(agentId: string, settings: AgentControlSettings): Promise<void> {
    // Clear existing monitoring interval
    if (this.monitoringIntervals.has(agentId)) {
      clearInterval(this.monitoringIntervals.get(agentId)!);
      this.monitoringIntervals.delete(agentId);
    }

    // If realtime monitoring is disabled, don't set up new interval
    if (!settings.realtimeMonitoringEnabled) {
      return;
    }

    // Set up new monitoring interval
    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(agentId, settings);
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
      }
    }, settings.monitoringFrequencySeconds * 1000);

    this.monitoringIntervals.set(agentId, interval);
  }

  private async performHealthCheck(agentId: string, settings: AgentControlSettings): Promise<void> {
    // This would perform actual health checks on the agent
    // For now, we'll just log that monitoring is active
    console.log(`Monitoring agent ${agentId} with frequency ${settings.monitoringFrequencySeconds}s`);
  }

  async pauseAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'inactive' });
    
    // Clear monitoring interval when paused
    if (this.monitoringIntervals.has(agentId)) {
      clearInterval(this.monitoringIntervals.get(agentId)!);
      this.monitoringIntervals.delete(agentId);
    }

    wsManager.broadcast({
      type: 'agent_status_changed',
      data: { agentId, status: 'inactive' }
    });
  }

  async resumeAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'active' });
    
    // Reapply control settings when resumed
    const settings = await this.getAgentControlSettings(agentId);
    if (settings) {
      await this.applyControlSettings(agentId, settings);
    }

    wsManager.broadcast({
      type: 'agent_status_changed',
      data: { agentId, status: 'active' }
    });
  }

  async restartAgent(agentId: string): Promise<void> {
    // Pause first
    await this.pauseAgent(agentId);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Resume
    await this.resumeAgent(agentId);

    wsManager.broadcast({
      type: 'agent_restarted',
      data: { agentId, timestamp: new Date() }
    });
  }

  async getAllAgentControlSettings(): Promise<AgentControlSettings[]> {
    return await storage.getAllAgentControlSettings();
  }

  // Cleanup method to clear all intervals
  cleanup(): void {
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }
}

// Export singleton instance
export const agentControlService = new AgentControlService();