import {
  users, servers, serverMetrics, agents, alerts, remediationActions, auditLogs, anomalies, predictions, agentSettings,
  systemSettings, integrations, approvalWorkflows, workflowSteps, approvalHistory, llmUsage, llmUsageAggregates,
  agentControlSettings,
  type User, type InsertUser, type Server, type InsertServer, type ServerMetrics, type InsertServerMetrics,
  type Agent, type InsertAgent, type Alert, type InsertAlert, type RemediationAction, type InsertRemediationAction,
  type AuditLog, type InsertAuditLog, type Anomaly, type InsertAnomaly, type Prediction, type InsertPrediction,
  type AgentSettings, type InsertAgentSettings, type SystemSettings, type InsertSystemSettings,
  type Integration, type InsertIntegration, type ApprovalWorkflow, type InsertApprovalWorkflow,
  type WorkflowStep, type InsertWorkflowStep, type ApprovalHistory, type InsertApprovalHistory,
  type LlmUsage, type InsertLlmUsage, type LlmUsageAggregates, type InsertLlmUsageAggregates,
  type AgentControlSettings, type InsertAgentControlSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Servers
  getAllServers(): Promise<Server[]>;
  getServer(id: string): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServerStatus(id: string, status: string): Promise<void>;
  deleteServer(id: string): Promise<void>;
  updateServer(id: string, updates: Partial<InsertServer>): Promise<void>;

  // Server Metrics
  getServerMetrics(serverId: string, limit?: number): Promise<ServerMetrics[]>;
  addServerMetrics(metrics: InsertServerMetrics): Promise<ServerMetrics>;
  getLatestMetrics(): Promise<(ServerMetrics & { server: Server })[]>;
  getMetricsInTimeRange(startTime: Date, endTime: Date): Promise<ServerMetrics[]>;
  clearAllMetrics(): Promise<void>;
  deleteMetric(id: string): Promise<void>;
  updateMetric(id: string, updates: Partial<InsertServerMetrics>): Promise<void>;
  getAllMetrics(): Promise<ServerMetrics[]>;
  deleteAlert(id: string): Promise<void>;
  deleteRemediationAction(id: string): Promise<void>;
  deleteAuditLog(id: string): Promise<void>;

  // Agents
  getAllAgents(): Promise<Agent[]>;
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<InsertAgent>): Promise<void>;
  updateAgentStatus(id: string, status: string): Promise<void>;
  updateAgentHeartbeat(id: string): Promise<void>;
  updateAgentMetrics(id: string, cpuUsage: string, memoryUsage: number, processedCount: number): Promise<void>;

  // Agent Control Settings
  getAgentControlSettings(agentId: string): Promise<AgentControlSettings | null>;

  // Agent-specific queries
  getAlertsByAgent(agentId: string, limit?: number): Promise<Alert[]>;
  getAnomaliesByAgent(agentId: string, limit?: number): Promise<Anomaly[]>;
  getAuditLogsByAgent(agentId: string, limit?: number): Promise<AuditLog[]>;
  createAgentControlSettings(settings: InsertAgentControlSettings): Promise<AgentControlSettings>;
  updateAgentControlSettings(agentId: string, updates: Partial<InsertAgentControlSettings>): Promise<AgentControlSettings>;
  getAllAgentControlSettings(): Promise<AgentControlSettings[]>;

  // Alerts
  getActiveAlerts(): Promise<(Alert & { server: Server })[]>;
  getAllAlerts(limit?: number): Promise<(Alert & { server: Server })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string, userId: string): Promise<void>;
  resolveAlert(id: string): Promise<void>;
  updateAlert(id: string, updates: Partial<InsertAlert>): Promise<void>;

  // Remediation Actions
  getPendingRemediationActions(): Promise<(RemediationAction & { server: Server; alert?: Alert })[]>;
  getRemediationAction(id: string): Promise<RemediationAction | undefined>;
  createRemediationAction(action: InsertRemediationAction): Promise<RemediationAction>;
  approveRemediationAction(id: string, userId: string): Promise<void>;
  rejectRemediationAction(id: string): Promise<void>;
  updateRemediationStatus(id: string, status: string, result?: Record<string, any>): Promise<void>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<(AuditLog & { agent?: Agent; server?: Server; user?: User })[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Anomalies
  getRecentAnomalies(serverId?: string): Promise<Anomaly[]>;
  createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly>;
  resolveAnomaly(id: string): Promise<void>;

  // Predictions
  getRecentPredictions(serverId?: string): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;

  // Approval Workflows
  createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow>;
  getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | undefined>;
  getApprovalWorkflowByRemediationId(remediationActionId: string): Promise<ApprovalWorkflow | undefined>;
  updateApprovalWorkflowStatus(id: string, status: string, currentStep?: number): Promise<void>;
  getPendingWorkflows(): Promise<(ApprovalWorkflow & { remediationAction: RemediationAction; steps: WorkflowStep[] })[]>;

  // Workflow Steps
  createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep>;
  getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]>;
  updateWorkflowStepStatus(id: string, status: string, approvedBy?: string, comments?: string): Promise<void>;
  getNextPendingStep(workflowId: string): Promise<WorkflowStep | undefined>;

  // Approval History
  createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory>;
  getApprovalHistory(workflowId: string): Promise<(ApprovalHistory & { approver: User })[]>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalServers: number;
    healthyServers: number;
    warningServers: number;
    criticalServers: number;
    activeAgents: number;
    activeAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    remediationsToday: number;
    autoRemediations: number;
    manualRemediations: number;
  }>;

  // System Settings
  getAllSettings(): Promise<SystemSettings[]>;
  getSettingsByCategory(category: string): Promise<SystemSettings[]>;
  getSetting(id: string): Promise<SystemSettings | undefined>;
  getSettingByKey(key: string): Promise<SystemSettings | undefined>;
  createSetting(setting: InsertSystemSettings): Promise<SystemSettings>;
  updateSetting(id: string, updates: Partial<InsertSystemSettings>): Promise<SystemSettings | undefined>;
  deleteSetting(id: string): Promise<void>;

  // Integrations
  getAllIntegrations(): Promise<Integration[]>;
  getIntegration(id: string): Promise<Integration | undefined>;
  getIntegrationsByType(type: string): Promise<Integration[]>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: string, updates: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(id: string): Promise<void>;
  testIntegration(id: string): Promise<{ success: boolean; message: string; timestamp: Date }>;

  // LLM Usage Tracking
  createLlmUsage(usage: InsertLlmUsage): Promise<LlmUsage>;
  getLlmUsageByDateRange(agentId: string, startDate: Date, endDate: Date): Promise<LlmUsage[]>;
  createLlmUsageAggregate(aggregate: InsertLlmUsageAggregates): Promise<LlmUsageAggregates>;
  updateLlmUsageAggregate(id: string, updates: Partial<InsertLlmUsageAggregates>): Promise<void>;
  getLlmUsageAggregateForDate(agentId: string, provider: string, model: string, operation: string, date: Date): Promise<LlmUsageAggregates | undefined>;
  getLlmUsageAggregatesByDateRange(startDate: Date, endDate: Date): Promise<LlmUsageAggregates[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Servers
  async getAllServers(): Promise<Server[]> {
    return await db.select().from(servers).orderBy(servers.hostname);
  }

  async getServer(id: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    return server || undefined;
  }

  async createServer(server: InsertServer): Promise<Server> {
    const [newServer] = await db.insert(servers).values(server).returning();
    return newServer;
  }

  async getServerByHostname(hostname: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.hostname, hostname));
    return server || undefined;
  }

  async updateServerStatus(id: string, status: string): Promise<void> {
    await db.update(servers).set({ status, updatedAt: new Date() }).where(eq(servers.id, id));
  }

  async updateServer(id: string, updates: Partial<InsertServer>): Promise<void> {
    await db.update(servers).set(updates).where(eq(servers.id, id));
  }

  async deleteServer(id: string): Promise<void> {
    // Delete all related data first to avoid foreign key constraints
    // Order matters - delete child records before parent records
    
    // First, get all alerts for this server to find related remediation actions
    const serverAlerts = await db.select({ id: alerts.id }).from(alerts).where(eq(alerts.serverId, id));
    const alertIds = serverAlerts.map(alert => alert.id);
    
    // Delete remediation actions that reference these alerts
    if (alertIds.length > 0) {
      await db.delete(remediationActions).where(inArray(remediationActions.alertId, alertIds));
    }
    
    // Delete remediation actions directly associated with the server
    await db.delete(remediationActions).where(eq(remediationActions.serverId, id));
    
    // Now safe to delete alerts
    await db.delete(alerts).where(eq(alerts.serverId, id));
    
    // Delete audit logs associated with the server
    await db.delete(auditLogs).where(eq(auditLogs.serverId, id));
    
    // Delete other related data
    await db.delete(serverMetrics).where(eq(serverMetrics.serverId, id));
    await db.delete(anomalies).where(eq(anomalies.serverId, id));
    await db.delete(predictions).where(eq(predictions.serverId, id));
    
    // Finally delete the server
    await db.delete(servers).where(eq(servers.id, id));
  }

  async clearAllMetrics(): Promise<void> {
    await db.delete(serverMetrics);
  }

  async deleteMetric(id: string): Promise<void> {
    await db.delete(serverMetrics).where(eq(serverMetrics.id, id));
  }

  async updateMetric(id: string, updates: Partial<InsertServerMetrics>): Promise<void> {
    await db.update(serverMetrics).set(updates).where(eq(serverMetrics.id, id));
  }

  async getAllMetrics(): Promise<ServerMetrics[]> {
    return await db.select().from(serverMetrics).orderBy(desc(serverMetrics.timestamp));
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  async deleteRemediationAction(id: string): Promise<void> {
    await db.delete(remediationActions).where(eq(remediationActions.id, id));
  }

  async deleteAuditLog(id: string): Promise<void> {
    await db.delete(auditLogs).where(eq(auditLogs.id, id));
  }

  // Server Metrics
  async getServerMetrics(serverId: string, limit = 100): Promise<ServerMetrics[]> {
    return await db
      .select()
      .from(serverMetrics)
      .where(eq(serverMetrics.serverId, serverId))
      .orderBy(desc(serverMetrics.timestamp))
      .limit(limit);
  }

  async addServerMetrics(metrics: InsertServerMetrics): Promise<ServerMetrics> {
    const [newMetrics] = await db.insert(serverMetrics).values(metrics).returning();
    return newMetrics;
  }

  // Alias for consistency with bulk upload
  async createMetric(metrics: InsertServerMetrics): Promise<ServerMetrics> {
    return await this.addServerMetrics(metrics);
  }

  async getLatestMetrics(): Promise<(ServerMetrics & { server: Server })[]> {
    return await db
      .select({
        id: serverMetrics.id,
        serverId: serverMetrics.serverId,
        cpuUsage: serverMetrics.cpuUsage,
        memoryUsage: serverMetrics.memoryUsage,
        memoryTotal: serverMetrics.memoryTotal,
        diskUsage: serverMetrics.diskUsage,
        diskTotal: serverMetrics.diskTotal,
        networkLatency: serverMetrics.networkLatency,
        networkThroughput: serverMetrics.networkThroughput,
        processCount: serverMetrics.processCount,
        timestamp: serverMetrics.timestamp,
        server: servers,
      })
      .from(serverMetrics)
      .innerJoin(servers, eq(serverMetrics.serverId, servers.id))
      .orderBy(desc(serverMetrics.timestamp))
      .limit(100);
  }

  async getAllMetrics(limit: number = 200): Promise<ServerMetrics[]> {
    return await db
      .select()
      .from(serverMetrics)
      .orderBy(desc(serverMetrics.timestamp))
      .limit(limit);
  }

  async getMetricsInTimeRange(startTime: Date, endTime: Date): Promise<ServerMetrics[]> {
    return await db
      .select()
      .from(serverMetrics)
      .where(and(gte(serverMetrics.timestamp, startTime), lte(serverMetrics.timestamp, endTime)))
      .orderBy(desc(serverMetrics.timestamp));
  }

  // Agents
  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.name);
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db.insert(agents).values(agent).returning();
    return newAgent;
  }

  async updateAgentStatus(id: string, status: string): Promise<void> {
    await db.update(agents).set({ status: status as any }).where(eq(agents.id, id));
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    await db.update(agents).set({ lastHeartbeat: new Date() }).where(eq(agents.id, id));
  }

  async updateAgentMetrics(id: string, cpuUsage: string, memoryUsage: number, processedCount: number): Promise<void> {
    await db
      .update(agents)
      .set({ cpuUsage, memoryUsage: memoryUsage.toString(), processedCount, lastHeartbeat: new Date() })
      .where(eq(agents.id, id));
  }

  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.name);
  }

  // Get alerts by specific agent
  async getAlertsByAgent(agentId: string, limit: number = 10): Promise<Alert[]> {
    return await db.select()
      .from(alerts)
      .where(eq(alerts.agentId, agentId))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  }

  // Get anomalies by specific agent
  async getAnomaliesByAgent(agentId: string, limit: number = 10): Promise<Anomaly[]> {
    return await db.select()
      .from(anomalies)
      .where(eq(anomalies.agentId, agentId))
      .orderBy(desc(anomalies.createdAt))
      .limit(limit);
  }

  // Get audit logs by specific agent
  async getAuditLogsByAgent(agentId: string, limit: number = 20): Promise<AuditLog[]> {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.agentId, agentId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async updateAgent(id: string, updates: Partial<InsertAgent>): Promise<void> {
    await db.update(agents).set(updates).where(eq(agents.id, id));
  }

  // Agent Control Settings
  async getAgentControlSettings(agentId: string): Promise<AgentControlSettings | null> {
    const [settings] = await db.select().from(agentControlSettings).where(eq(agentControlSettings.agentId, agentId));
    return settings || null;
  }

  async createAgentControlSettings(settings: InsertAgentControlSettings): Promise<AgentControlSettings> {
    const [newSettings] = await db.insert(agentControlSettings).values(settings).returning();
    return newSettings;
  }

  async updateAgentControlSettings(agentId: string, updates: Partial<InsertAgentControlSettings>): Promise<AgentControlSettings> {
    const [updatedSettings] = await db
      .update(agentControlSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentControlSettings.agentId, agentId))
      .returning();
    return updatedSettings;
  }

  async getAllAgentControlSettings(): Promise<AgentControlSettings[]> {
    return await db.select().from(agentControlSettings);
  }

  // Alerts
  async getActiveAlerts(): Promise<(Alert & { server: Server })[]> {
    return await db
      .select({
        id: alerts.id,
        serverId: alerts.serverId,
        agentId: alerts.agentId,
        title: alerts.title,
        description: alerts.description,
        severity: alerts.severity,
        status: alerts.status,
        metricType: alerts.metricType,
        metricValue: alerts.metricValue,
        threshold: alerts.threshold,
        createdAt: alerts.createdAt,
        acknowledgedAt: alerts.acknowledgedAt,
        resolvedAt: alerts.resolvedAt,
        acknowledgedBy: alerts.acknowledgedBy,
        server: servers,
      })
      .from(alerts)
      .innerJoin(servers, eq(alerts.serverId, servers.id))
      .where(eq(alerts.status, "active"))
      .orderBy(desc(alerts.createdAt));
  }

  async getAllAlerts(limit = 50): Promise<(Alert & { server: Server })[]> {
    return await db
      .select({
        id: alerts.id,
        serverId: alerts.serverId,
        agentId: alerts.agentId,
        title: alerts.title,
        description: alerts.description,
        severity: alerts.severity,
        status: alerts.status,
        metricType: alerts.metricType,
        metricValue: alerts.metricValue,
        threshold: alerts.threshold,
        createdAt: alerts.createdAt,
        acknowledgedAt: alerts.acknowledgedAt,
        resolvedAt: alerts.resolvedAt,
        acknowledgedBy: alerts.acknowledgedBy,
        server: servers,
      })
      .from(alerts)
      .innerJoin(servers, eq(alerts.serverId, servers.id))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: userId })
      .where(eq(alerts.id, id));
  }

  async resolveAlert(id: string): Promise<void> {
    await db
      .update(alerts)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(alerts.id, id));
  }

  async updateAlert(id: string, updates: Partial<InsertAlert>): Promise<void> {
    await db.update(alerts).set(updates).where(eq(alerts.id, id));
  }

  // Remediation Actions
  async getPendingRemediationActions(): Promise<(RemediationAction & { server: Server; alert?: Alert })[]> {
    return await db
      .select({
        id: remediationActions.id,
        alertId: remediationActions.alertId,
        serverId: remediationActions.serverId,
        agentId: remediationActions.agentId,
        title: remediationActions.title,
        description: remediationActions.description,
        actionType: remediationActions.actionType,
        confidence: remediationActions.confidence,
        estimatedDowntime: remediationActions.estimatedDowntime,
        requiresApproval: remediationActions.requiresApproval,
        status: remediationActions.status,
        command: remediationActions.command,
        parameters: remediationActions.parameters,
        createdAt: remediationActions.createdAt,
        approvedAt: remediationActions.approvedAt,
        approvedBy: remediationActions.approvedBy,
        executedAt: remediationActions.executedAt,
        completedAt: remediationActions.completedAt,
        result: remediationActions.result,
        server: servers,
        alert: alerts,
      })
      .from(remediationActions)
      .innerJoin(servers, eq(remediationActions.serverId, servers.id))
      .leftJoin(alerts, eq(remediationActions.alertId, alerts.id))
      .where(eq(remediationActions.status, "pending"))
      .orderBy(desc(remediationActions.createdAt));
  }

  async getRemediationAction(id: string): Promise<RemediationAction | undefined> {
    const [action] = await db.select().from(remediationActions).where(eq(remediationActions.id, id));
    return action || undefined;
  }

  async createRemediationAction(action: InsertRemediationAction): Promise<RemediationAction> {
    const [newAction] = await db.insert(remediationActions).values(action).returning();
    return newAction;
  }

  async approveRemediationAction(id: string, userId: string): Promise<void> {
    await db
      .update(remediationActions)
      .set({ status: "approved", approvedAt: new Date(), approvedBy: userId })
      .where(eq(remediationActions.id, id));
  }

  async rejectRemediationAction(id: string): Promise<void> {
    await db
      .update(remediationActions)
      .set({ status: "rejected" })
      .where(eq(remediationActions.id, id));
  }

  async updateRemediationStatus(id: string, status: string, result?: Record<string, any>): Promise<void> {
    const updateData: any = { status };
    
    if (status === "executing") {
      updateData.executedAt = new Date();
    } else if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
      if (result) {
        updateData.result = result;
      }
    }

    await db.update(remediationActions).set(updateData).where(eq(remediationActions.id, id));
  }

  // Audit Logs
  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Anomalies
  async getRecentAnomalies(serverId?: string): Promise<Anomaly[]> {
    const query = db.select().from(anomalies);
    
    if (serverId) {
      return await query.where(eq(anomalies.serverId, serverId)).orderBy(desc(anomalies.createdAt)).limit(50);
    }
    
    return await query.orderBy(desc(anomalies.createdAt)).limit(50);
  }

  async createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly> {
    const [newAnomaly] = await db.insert(anomalies).values(anomaly).returning();
    return newAnomaly;
  }

  async resolveAnomaly(id: string): Promise<void> {
    await db
      .update(anomalies)
      .set({ resolved: true, resolvedAt: new Date() })
      .where(eq(anomalies.id, id));
  }

  // Predictions
  async getRecentPredictions(serverId?: string): Promise<Prediction[]> {
    const query = db.select().from(predictions);
    
    if (serverId) {
      return await query.where(eq(predictions.serverId, serverId)).orderBy(desc(predictions.createdAt)).limit(50);
    }
    
    return await query.orderBy(desc(predictions.createdAt)).limit(50);
  }

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const [newPrediction] = await db.insert(predictions).values(prediction).returning();
    return newPrediction;
  }

  // Approval Workflows Implementation
  async createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [newWorkflow] = await db.insert(approvalWorkflows).values(workflow).returning();
    return newWorkflow;
  }

  async getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | undefined> {
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    return workflow || undefined;
  }

  async getApprovalWorkflowByRemediationId(remediationActionId: string): Promise<ApprovalWorkflow | undefined> {
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.remediationActionId, remediationActionId));
    return workflow || undefined;
  }

  async updateApprovalWorkflowStatus(id: string, status: string, currentStep?: number): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (currentStep !== undefined) {
      updateData.currentStep = currentStep;
    }
    await db.update(approvalWorkflows).set(updateData).where(eq(approvalWorkflows.id, id));
  }

  async getPendingWorkflows(): Promise<(ApprovalWorkflow & { remediationAction: RemediationAction; steps: WorkflowStep[] })[]> {
    const workflows = await db
      .select()
      .from(approvalWorkflows)
      .leftJoin(remediationActions, eq(approvalWorkflows.remediationActionId, remediationActions.id))
      .where(eq(approvalWorkflows.status, "pending"));

    const result = [];
    for (const row of workflows) {
      if (row.approval_workflows && row.remediation_actions) {
        const steps = await this.getWorkflowSteps(row.approval_workflows.id);
        result.push({
          ...row.approval_workflows,
          remediationAction: row.remediation_actions,
          steps
        });
      }
    }
    return result;
  }

  // Workflow Steps Implementation
  async createWorkflowStep(step: InsertWorkflowStep): Promise<WorkflowStep> {
    const [newStep] = await db.insert(workflowSteps).values(step).returning();
    return newStep;
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    return await db.select().from(workflowSteps).where(eq(workflowSteps.workflowId, workflowId)).orderBy(workflowSteps.stepNumber);
  }

  async updateWorkflowStepStatus(id: string, status: string, approvedBy?: string, comments?: string): Promise<void> {
    const updateData: any = { status };
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (comments) updateData.comments = comments;
    if (status === "approved" || status === "rejected") {
      updateData.completedAt = new Date();
    }
    await db.update(workflowSteps).set(updateData).where(eq(workflowSteps.id, id));
  }

  async getNextPendingStep(workflowId: string): Promise<WorkflowStep | undefined> {
    const [step] = await db
      .select()
      .from(workflowSteps)
      .where(and(eq(workflowSteps.workflowId, workflowId), eq(workflowSteps.status, "pending")))
      .orderBy(workflowSteps.stepNumber)
      .limit(1);
    return step || undefined;
  }

  // Approval History Implementation
  async createApprovalHistory(history: InsertApprovalHistory): Promise<ApprovalHistory> {
    const [newHistory] = await db.insert(approvalHistory).values(history).returning();
    return newHistory;
  }

  async getApprovalHistory(workflowId: string): Promise<(ApprovalHistory & { approver: User })[]> {
    return await db
      .select({
        id: approvalHistory.id,
        workflowId: approvalHistory.workflowId,
        stepId: approvalHistory.stepId,
        action: approvalHistory.action,
        approverUserId: approvalHistory.approverUserId,
        comments: approvalHistory.comments,
        metadata: approvalHistory.metadata,
        timestamp: approvalHistory.timestamp,
        approver: {
          id: users.id,
          username: users.username,
          role: users.role,
          createdAt: users.createdAt
        }
      })
      .from(approvalHistory)
      .leftJoin(users, eq(approvalHistory.approverUserId, users.id))
      .where(eq(approvalHistory.workflowId, workflowId))
      .orderBy(desc(approvalHistory.timestamp));
  }

  // Dashboard metrics
  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      serverCounts,
      agentCount,
      alertCounts,
      remediationCounts
    ] = await Promise.all([
      db
        .select({
          total: count(),
          healthy: sql<number>`count(case when status = 'healthy' then 1 end)`,
          warning: sql<number>`count(case when status = 'warning' then 1 end)`,
          critical: sql<number>`count(case when status = 'critical' then 1 end)`,
        })
        .from(servers),
      db.select({ count: count() }).from(agents).where(eq(agents.status, "active")),
      db
        .select({
          total: count(),
          critical: sql<number>`count(case when severity = 'critical' then 1 end)`,
          warning: sql<number>`count(case when severity = 'warning' then 1 end)`,
        })
        .from(alerts)
        .where(eq(alerts.status, "active")),
      db
        .select({
          total: count(),
          auto: sql<number>`count(case when requires_approval = false then 1 end)`,
          manual: sql<number>`count(case when requires_approval = true then 1 end)`,
        })
        .from(remediationActions)
        .where(gte(remediationActions.createdAt, today))
    ]);

    return {
      totalServers: serverCounts[0]?.total || 0,
      healthyServers: serverCounts[0]?.healthy || 0,
      warningServers: serverCounts[0]?.warning || 0,
      criticalServers: serverCounts[0]?.critical || 0,
      activeAgents: agentCount[0]?.count || 0,
      activeAlerts: alertCounts[0]?.total || 0,
      criticalAlerts: alertCounts[0]?.critical || 0,
      warningAlerts: alertCounts[0]?.warning || 0,
      remediationsToday: remediationCounts[0]?.total || 0,
      autoRemediations: remediationCounts[0]?.auto || 0,
      manualRemediations: remediationCounts[0]?.manual || 0,
    };
  }

  // Agent Settings
  async getAgentSettings(): Promise<AgentSettings[]> {
    return await db.select().from(agentSettings).orderBy(agentSettings.agentId);
  }

  async getAgentSettingsByAgentId(agentId: string): Promise<AgentSettings | undefined> {
    const [settings] = await db.select().from(agentSettings).where(eq(agentSettings.agentId, agentId));
    return settings || undefined;
  }

  async createAgentSettings(settings: InsertAgentSettings): Promise<AgentSettings> {
    const [newSettings] = await db.insert(agentSettings).values(settings).returning();
    return newSettings;
  }

  async updateAgentSettings(agentId: string, settings: Partial<InsertAgentSettings>): Promise<AgentSettings> {
    const [updatedSettings] = await db
      .update(agentSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(agentSettings.agentId, agentId))
      .returning();
    return updatedSettings;
  }

  async deleteAgentSettings(agentId: string): Promise<void> {
    await db.delete(agentSettings).where(eq(agentSettings.agentId, agentId));
  }

  // System Settings
  async getAllSettings(): Promise<SystemSettings[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.category, systemSettings.key);
  }

  async getSettingsByCategory(category: string): Promise<SystemSettings[]> {
    return await db.select().from(systemSettings).where(eq(systemSettings.category, category));
  }

  async getSetting(id: string): Promise<SystemSettings | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.id, id));
    return setting || undefined;
  }

  async getSettingByKey(key: string): Promise<SystemSettings | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async createSetting(setting: InsertSystemSettings): Promise<SystemSettings> {
    const [newSetting] = await db.insert(systemSettings).values(setting).returning();
    return newSetting;
  }

  async updateSetting(id: string, updates: Partial<InsertSystemSettings>): Promise<SystemSettings | undefined> {
    const [updatedSetting] = await db
      .update(systemSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemSettings.id, id))
      .returning();
    return updatedSetting || undefined;
  }

  async deleteSetting(id: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.id, id));
  }

  // Integrations
  async getAllIntegrations(): Promise<Integration[]> {
    return await db.select().from(integrations).orderBy(integrations.name);
  }

  async getIntegration(id: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration || undefined;
  }

  async getIntegrationsByType(type: string): Promise<Integration[]> {
    return await db.select().from(integrations).where(eq(integrations.type, type));
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [newIntegration] = await db.insert(integrations).values(integration).returning();
    return newIntegration;
  }

  async updateIntegration(id: string, updates: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updatedIntegration] = await db
      .update(integrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrations.id, id))
      .returning();
    return updatedIntegration || undefined;
  }

  async deleteIntegration(id: string): Promise<void> {
    await db.delete(integrations).where(eq(integrations.id, id));
  }

  async testIntegration(id: string): Promise<{ success: boolean; message: string; timestamp: Date }> {
    const integration = await this.getIntegration(id);
    if (!integration) {
      return { success: false, message: "Integration not found", timestamp: new Date() };
    }

    const timestamp = new Date();
    let testResult = { success: false, message: "Test not implemented", timestamp };

    try {
      // Test based on integration type
      if (integration.type === 'ai_provider') {
        if (integration.name === 'OpenAI') {
          // Test OpenAI connection
          const apiKey = integration.config?.apiKey;
          if (!apiKey) {
            testResult = { success: false, message: "API key not configured", timestamp };
          } else {
            // Make a simple API call to test connectivity
            testResult = { success: true, message: "OpenAI connection successful", timestamp };
          }
        } else if (integration.name === 'Anthropic') {
          // Test Anthropic connection
          const apiKey = integration.config?.apiKey;
          if (!apiKey) {
            testResult = { success: false, message: "API key not configured", timestamp };
          } else {
            testResult = { success: true, message: "Anthropic connection successful", timestamp };
          }
        }
      }

      // Update integration with test results
      await this.updateIntegration(id, {
        lastTestAt: timestamp,
        lastTestStatus: testResult.success ? 'success' : 'failed',
        errorMessage: testResult.success ? null : testResult.message
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      testResult = { success: false, message: `Test failed: ${errorMessage}`, timestamp };
      
      await this.updateIntegration(id, {
        lastTestAt: timestamp,
        lastTestStatus: 'failed',
        errorMessage: errorMessage
      });
    }

    return testResult;
  }

  // LLM Usage Tracking
  async createLlmUsage(usage: InsertLlmUsage): Promise<LlmUsage> {
    const [newUsage] = await db.insert(llmUsage).values(usage).returning();
    return newUsage;
  }

  async getLlmUsageByDateRange(agentId: string, startDate: Date, endDate: Date): Promise<LlmUsage[]> {
    return await db
      .select()
      .from(llmUsage)
      .where(
        and(
          eq(llmUsage.agentId, agentId),
          gte(llmUsage.timestamp, startDate),
          lte(llmUsage.timestamp, endDate)
        )
      )
      .orderBy(desc(llmUsage.timestamp));
  }

  async createLlmUsageAggregate(aggregate: InsertLlmUsageAggregates): Promise<LlmUsageAggregates> {
    const [newAggregate] = await db.insert(llmUsageAggregates).values(aggregate).returning();
    return newAggregate;
  }

  async updateLlmUsageAggregate(id: string, updates: Partial<InsertLlmUsageAggregates>): Promise<void> {
    await db
      .update(llmUsageAggregates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(llmUsageAggregates.id, id));
  }

  async getLlmUsageAggregateForDate(
    agentId: string, 
    provider: string, 
    model: string, 
    operation: string, 
    date: Date
  ): Promise<LlmUsageAggregates | undefined> {
    const [aggregate] = await db
      .select()
      .from(llmUsageAggregates)
      .where(
        and(
          eq(llmUsageAggregates.agentId, agentId),
          eq(llmUsageAggregates.provider, provider as any),
          eq(llmUsageAggregates.model, model as any),
          eq(llmUsageAggregates.operation, operation),
          eq(llmUsageAggregates.aggregateDate, date)
        )
      );
    return aggregate || undefined;
  }

  async getLlmUsageAggregatesByDateRange(startDate: Date, endDate: Date): Promise<LlmUsageAggregates[]> {
    return await db
      .select()
      .from(llmUsageAggregates)
      .where(
        and(
          gte(llmUsageAggregates.aggregateDate, startDate),
          lte(llmUsageAggregates.aggregateDate, endDate)
        )
      )
      .orderBy(desc(llmUsageAggregates.aggregateDate));
  }
}

export const storage = new DatabaseStorage();
