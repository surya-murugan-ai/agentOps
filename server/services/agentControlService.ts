import { storage } from "../storage";
import { wsManager } from "./websocket";
import type { AgentControlSettings, InsertAgentControlSettings, Agent } from "@shared/schema";

export interface AgentControlConfig {
  realtimeMonitoringEnabled: boolean;
  monitoringFrequencySeconds: number;
  autoRestartEnabled: boolean;
  maxRetries: number;
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
  };
  operatingSchedule: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: string;
      startTime: string;
      endTime: string;
      enabled: boolean;
    }>;
  };
}

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
    wsManager.broadcastToAll({
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

    // Set up new monitoring interval based on frequency
    const interval = setInterval(async () => {
      await this.performAgentHealthCheck(agentId, settings);
    }, settings.monitoringFrequencySeconds * 1000);

    this.monitoringIntervals.set(agentId, interval);
  }

  private async performAgentHealthCheck(
    agentId: string, 
    settings: AgentControlSettings
  ): Promise<void> {
    try {
      const agent = await storage.getAgent(agentId);
      if (!agent) return;

      // Check if agent is within operating schedule
      if (settings.operatingSchedule.enabled) {
        const shouldBeRunning = this.isWithinOperatingSchedule(settings.operatingSchedule);
        if (!shouldBeRunning && agent.status === 'active') {
          await this.pauseAgent(agentId);
          return;
        } else if (shouldBeRunning && agent.status === 'paused') {
          await this.resumeAgent(agentId);
          return;
        }
      }

      // Check thresholds
      const alerts = await this.checkAgentThresholds(agent, settings.alertThresholds);
      
      // Handle auto-restart if needed
      if (settings.autoRestartEnabled && this.shouldRestartAgent(agent, alerts)) {
        await this.restartAgent(agentId);
      }

      // Broadcast health status
      wsManager.broadcastToAll({
        type: 'agent_health_check',
        data: { agentId, health: this.calculateHealthScore(agent, alerts) }
      });

    } catch (error) {
      console.error(`Health check failed for agent ${agentId}:`, error);
    }
  }

  private isWithinOperatingSchedule(schedule: AgentControlSettings['operatingSchedule']): boolean {
    if (!schedule.enabled) return true;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todaySchedule = schedule.schedule.find(s => s.day === currentDay && s.enabled);
    if (!todaySchedule) return false;

    return currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime;
  }

  private async checkAgentThresholds(
    agent: Agent, 
    thresholds: AgentControlSettings['alertThresholds']
  ): Promise<string[]> {
    const alerts: string[] = [];

    if (parseFloat(agent.cpuUsage || "0") > thresholds.cpuUsage) {
      alerts.push(`CPU usage (${agent.cpuUsage}%) exceeds threshold (${thresholds.cpuUsage}%)`);
    }

    if (parseFloat(agent.memoryUsage || "0") > thresholds.memoryUsage) {
      alerts.push(`Memory usage (${agent.memoryUsage}MB) exceeds threshold (${thresholds.memoryUsage}MB)`);
    }

    const errorRate = agent.processedCount > 0 ? (agent.errorCount / agent.processedCount) * 100 : 0;
    if (errorRate > thresholds.errorRate) {
      alerts.push(`Error rate (${errorRate.toFixed(1)}%) exceeds threshold (${thresholds.errorRate}%)`);
    }

    return alerts;
  }

  private shouldRestartAgent(agent: Agent, alerts: string[]): boolean {
    return alerts.length > 2 || agent.status === 'error';
  }

  private calculateHealthScore(agent: Agent, alerts: string[]): number {
    let score = 100;
    score -= alerts.length * 20; // Each alert reduces score by 20
    if (agent.status === 'error') score -= 50;
    if (agent.status === 'inactive') score -= 30;
    return Math.max(0, score);
  }

  async pauseAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'paused' as any });
    wsManager.broadcastToAll({
      type: 'agent_status_changed',
      data: { agentId, status: 'paused' }
    });
  }

  async resumeAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'active' as any });
    wsManager.broadcastToAll({
      type: 'agent_status_changed',
      data: { agentId, status: 'active' }
    });
  }

  async restartAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { 
      status: 'active' as any,
      errorCount: 0,
      lastHeartbeat: new Date()
    });
    
    wsManager.broadcastToAll({
      type: 'agent_restarted',
      data: { agentId, timestamp: new Date() }
    });
  }

  async getAllAgentControlSettings(): Promise<AgentControlSettings[]> {
    return await storage.getAllAgentControlSettings();
  }

  async initializeAgentControlSettings(): Promise<void> {
    const agents = await storage.getAgents();
    
    for (const agent of agents) {
      const existingSettings = await this.getAgentControlSettings(agent.id);
      if (!existingSettings) {
        await this.createDefaultControlSettings(agent.id);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Clear all monitoring intervals
    for (const [agentId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
    this.agentConfigCache.clear();
  }
}

export const agentControlService = new AgentControlService();