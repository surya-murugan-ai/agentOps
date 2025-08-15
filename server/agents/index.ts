import { TelemetryCollectorAgent } from "./telemetryCollector";
import { AnomalyDetectorAgent } from "./anomalyDetector";
import { PredictiveAnalyticsAgent } from "./predictiveAnalytics";
import { RecommendationEngineAgent } from "./recommendationEngine";
import { ApprovalComplianceAgent } from "./approvalCompliance";
import { RemediationExecutorAgent } from "./remediationExecutor";
import { AuditReportingAgent } from "./auditReporting";
import { CloudCollectorAgent } from "./cloudCollector";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export interface Agent {
  id: string;
  name: string;
  type: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getStatus(): any;
}

class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private running = false;

  async start() {
    if (this.running) return;
    
    console.log("Starting AI Agent Manager...");
    this.running = true;

    // Initialize all agents
    const agents = [
      new TelemetryCollectorAgent(),
      new AnomalyDetectorAgent(),
      new PredictiveAnalyticsAgent(),
      new RecommendationEngineAgent(),
      new ApprovalComplianceAgent(),
      new RemediationExecutorAgent(),
      new AuditReportingAgent(),
      new CloudCollectorAgent(storage),
    ];

    // Register agents in database
    for (const agent of agents) {
      try {
        // Check if agent already exists
        const existingAgent = await storage.getAgent(agent.id);
        if (!existingAgent) {
          await storage.createAgent({
            id: agent.id,
            name: agent.name,
            type: agent.type as any,
            status: "active",
          });
        }
        
        this.agents.set(agent.id, agent);
        await agent.start();
        await storage.updateAgentStatus(agent.id, "active");
        console.log(`Started agent: ${agent.name}`);
      } catch (error) {
        console.error(`Failed to start agent ${agent.name}:`, error);
      }
    }

    // Start status monitoring
    this.startStatusMonitoring();
  }

  async stop() {
    if (!this.running) return;
    
    console.log("Stopping AI Agent Manager...");
    this.running = false;

    for (const [id, agent] of this.agents) {
      try {
        await agent.stop();
        await storage.updateAgentStatus(id, "inactive");
        console.log(`Stopped agent: ${agent.name}`);
      } catch (error) {
        console.error(`Error stopping agent ${agent.name}:`, error);
      }
    }

    this.agents.clear();
  }

  private startStatusMonitoring() {
    setInterval(async () => {
      if (!this.running) return;

      for (const [id, agent] of this.agents) {
        try {
          const status = agent.getStatus();
          
          // Update agent metrics
          await storage.updateAgentMetrics(
            id,
            status.cpuUsage || "0",
            status.memoryUsage || 0,
            status.processedCount || 0
          );

          // Update agent status to active if it's running properly
          await storage.updateAgentStatus(id, "active");

          // Broadcast agent status update
          wsManager.broadcastAgentStatus(id, status);
        } catch (error) {
          console.error(`Error updating status for agent ${agent.name}:`, error);
          // Set agent status to error if there's an issue
          try {
            await storage.updateAgentStatus(id, "error");
          } catch (dbError) {
            console.error(`Error updating agent status to error:`, dbError);
          }
        }
      }
    }, 30000); // Update every 30 seconds
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  async executeRemediationAction(actionId: string) {
    const executorAgent = this.agents.get("remediation-executor-001");
    if (executorAgent && "executeAction" in executorAgent) {
      (executorAgent as any).executeAction(actionId);
    }
  }

  async sendMessage(fromAgentId: string, toAgentId: string, message: any) {
    const toAgent = this.agents.get(toAgentId);
    if (toAgent && "receiveMessage" in toAgent) {
      (toAgent as any).receiveMessage(fromAgentId, message);
    }
  }

  async broadcastMessage(fromAgentId: string, message: any) {
    for (const [id, agent] of this.agents) {
      if (id !== fromAgentId && "receiveMessage" in agent) {
        (agent as any).receiveMessage(fromAgentId, message);
      }
    }
  }
}

export const agentManager = new AgentManager();
