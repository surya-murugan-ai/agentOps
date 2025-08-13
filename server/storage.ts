import {
  users, servers, serverMetrics, agents, alerts, remediationActions, auditLogs, anomalies, predictions,
  type User, type InsertUser, type Server, type InsertServer, type ServerMetrics, type InsertServerMetrics,
  type Agent, type InsertAgent, type Alert, type InsertAlert, type RemediationAction, type InsertRemediationAction,
  type AuditLog, type InsertAuditLog, type Anomaly, type InsertAnomaly, type Prediction, type InsertPrediction
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

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

  // Server Metrics
  getServerMetrics(serverId: string, limit?: number): Promise<ServerMetrics[]>;
  addServerMetrics(metrics: InsertServerMetrics): Promise<ServerMetrics>;
  getLatestMetrics(): Promise<(ServerMetrics & { server: Server })[]>;
  getMetricsInTimeRange(startTime: Date, endTime: Date): Promise<ServerMetrics[]>;

  // Agents
  getAllAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: string, status: string): Promise<void>;
  updateAgentHeartbeat(id: string): Promise<void>;
  updateAgentMetrics(id: string, cpuUsage: string, memoryUsage: number, processedCount: number): Promise<void>;

  // Alerts
  getActiveAlerts(): Promise<(Alert & { server: Server })[]>;
  getAllAlerts(limit?: number): Promise<(Alert & { server: Server })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string, userId: string): Promise<void>;
  resolveAlert(id: string): Promise<void>;

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

  async updateServerStatus(id: string, status: string): Promise<void> {
    await db.update(servers).set({ status, updatedAt: new Date() }).where(eq(servers.id, id));
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
  async getAuditLogs(limit = 50): Promise<(AuditLog & { agent?: Agent; server?: Server; user?: User })[]> {
    return await db
      .select({
        id: auditLogs.id,
        agentId: auditLogs.agentId,
        serverId: auditLogs.serverId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        details: auditLogs.details,
        status: auditLogs.status,
        impact: auditLogs.impact,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        agent: agents,
        server: servers,
        user: users,
      })
      .from(auditLogs)
      .leftJoin(agents, eq(auditLogs.agentId, agents.id))
      .leftJoin(servers, eq(auditLogs.serverId, servers.id))
      .leftJoin(users, eq(auditLogs.userId, users.id))
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
}

export const storage = new DatabaseStorage();
