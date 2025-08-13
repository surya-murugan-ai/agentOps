import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { setupWebSocket, wsManager } from "./services/websocket";
import { agentManager } from "./agents";
import { nanoid } from "nanoid";
import { insertServerMetricsSchema, insertRemediationActionSchema, insertAuditLogSchema } from "@shared/schema";
import { z } from "zod";
import { DataExtractionService } from "./services/dataExtractionService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const dataExtractor = new DataExtractionService();

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocket(wss);

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Servers endpoints
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getAllServers();
      res.json(servers);
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  app.get("/api/servers/:id", async (req, res) => {
    try {
      const server = await storage.getServer(req.params.id);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }
      res.json(server);
    } catch (error) {
      console.error("Error fetching server:", error);
      res.status(500).json({ error: "Failed to fetch server" });
    }
  });

  app.get("/api/servers/:id/metrics", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const metrics = await storage.getServerMetrics(req.params.id, limit);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching server metrics:", error);
      res.status(500).json({ error: "Failed to fetch server metrics" });
    }
  });

  // Latest metrics for all servers
  app.get("/api/metrics/latest", async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching latest metrics:", error);
      res.status(500).json({ error: "Failed to fetch latest metrics" });
    }
  });

  // Metrics in time range
  app.get("/api/metrics/range", async (req, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ error: "Start and end time required" });
      }
      
      const startTime = new Date(start as string);
      const endTime = new Date(end as string);
      const metrics = await storage.getMetricsInTimeRange(startTime, endTime);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics range:", error);
      res.status(500).json({ error: "Failed to fetch metrics range" });
    }
  });

  // Add server metrics (used by telemetry collector)
  app.post("/api/metrics", async (req, res) => {
    try {
      const validatedMetrics = insertServerMetricsSchema.parse(req.body);
      const metrics = await storage.addServerMetrics(validatedMetrics);
      res.json(metrics);
    } catch (error) {
      console.error("Error adding metrics:", error);
      res.status(500).json({ error: "Failed to add metrics" });
    }
  });

  // Agents endpoints
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const active = req.query.active === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const alerts = active 
        ? await storage.getActiveAlerts()
        : await storage.getAllAlerts(limit);
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      await storage.acknowledgeAlert(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  app.post("/api/alerts/:id/resolve", async (req, res) => {
    try {
      await storage.resolveAlert(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Remediation actions endpoints
  app.get("/api/remediation-actions", async (req, res) => {
    try {
      const pending = req.query.pending === 'true';
      
      if (pending) {
        const actions = await storage.getPendingRemediationActions();
        res.json(actions);
      } else {
        // For now, just return pending actions
        const actions = await storage.getPendingRemediationActions();
        res.json(actions);
      }
    } catch (error) {
      console.error("Error fetching remediation actions:", error);
      res.status(500).json({ error: "Failed to fetch remediation actions" });
    }
  });

  app.post("/api/remediation-actions", async (req, res) => {
    try {
      const validatedAction = insertRemediationActionSchema.parse(req.body);
      const action = await storage.createRemediationAction(validatedAction);
      res.json(action);
    } catch (error) {
      console.error("Error creating remediation action:", error);
      res.status(500).json({ error: "Failed to create remediation action" });
    }
  });

  app.post("/api/remediation-actions/:id/approve", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      await storage.approveRemediationAction(req.params.id, userId);
      
      // Execute the remediation action
      agentManager.executeRemediationAction(req.params.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving remediation action:", error);
      res.status(500).json({ error: "Failed to approve remediation action" });
    }
  });

  app.post("/api/remediation-actions/:id/reject", async (req, res) => {
    try {
      await storage.rejectRemediationAction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting remediation action:", error);
      res.status(500).json({ error: "Failed to reject remediation action" });
    }
  });

  // Audit logs endpoints
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const validatedLog = insertAuditLogSchema.parse(req.body);
      const log = await storage.createAuditLog(validatedLog);
      res.json(log);
    } catch (error) {
      console.error("Error creating audit log:", error);
      res.status(500).json({ error: "Failed to create audit log" });
    }
  });

  // Anomalies endpoints
  app.get("/api/anomalies", async (req, res) => {
    try {
      const serverId = req.query.serverId as string;
      const anomalies = await storage.getRecentAnomalies(serverId);
      res.json(anomalies);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
      res.status(500).json({ error: "Failed to fetch anomalies" });
    }
  });

  // Predictions endpoints
  app.get("/api/predictions", async (req, res) => {
    try {
      const serverId = req.query.serverId as string;
      const predictions = await storage.getRecentPredictions(serverId);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  // Bulk upload endpoints for live data integration
  app.post("/api/servers/bulk", async (req, res) => {
    try {
      const { servers } = req.body;
      if (!Array.isArray(servers)) {
        return res.status(400).json({ error: "Expected array of servers" });
      }

      let count = 0;
      for (const serverData of servers) {
        try {
          await storage.createServer({
            ...serverData,
            id: nanoid(),
            status: serverData.status || "healthy",
            environment: serverData.environment || "production",
            location: serverData.location || "unknown",
            tags: serverData.tags || [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          count++;
        } catch (error) {
          console.error("Error creating server:", error);
        }
      }

      res.json({ count, message: `Successfully uploaded ${count} servers` });
    } catch (error) {
      console.error("Error in bulk server upload:", error);
      res.status(500).json({ error: "Failed to upload servers" });
    }
  });

  app.post("/api/metrics/bulk", async (req, res) => {
    try {
      const { metrics } = req.body;
      if (!Array.isArray(metrics)) {
        return res.status(400).json({ error: "Expected array of metrics" });
      }

      let count = 0;
      for (const metricData of metrics) {
        try {
          // Find server by hostname if serverId not provided
          if (!metricData.serverId && metricData.hostname) {
            const server = await storage.getServerByHostname(metricData.hostname);
            if (server) {
              metricData.serverId = server.id;
            }
          }

          if (metricData.serverId) {
            await storage.createMetric({
              ...metricData,
              id: nanoid(),
              timestamp: metricData.timestamp ? new Date(metricData.timestamp) : new Date()
            });
            count++;
          }
        } catch (error) {
          console.error("Error creating metric:", error);
        }
      }

      res.json({ count, message: `Successfully uploaded ${count} metric records` });
    } catch (error) {
      console.error("Error in bulk metrics upload:", error);
      res.status(500).json({ error: "Failed to upload metrics" });
    }
  });

  app.post("/api/alerts/bulk", async (req, res) => {
    try {
      const { alerts } = req.body;
      if (!Array.isArray(alerts)) {
        return res.status(400).json({ error: "Expected array of alerts" });
      }

      let count = 0;
      for (const alertData of alerts) {
        try {
          // Find server by hostname if serverId not provided
          if (!alertData.serverId && alertData.hostname) {
            const server = await storage.getServerByHostname(alertData.hostname);
            if (server) {
              alertData.serverId = server.id;
            }
          }

          if (alertData.serverId) {
            await storage.createAlert({
              ...alertData,
              id: nanoid(),
              status: alertData.status || "active",
              metricType: alertData.metricType || "system",
              severity: alertData.severity || "warning",
              createdAt: new Date()
            });
            count++;
          }
        } catch (error) {
          console.error("Error creating alert:", error);
        }
      }

      res.json({ count, message: `Successfully uploaded ${count} alerts` });
    } catch (error) {
      console.error("Error in bulk alerts upload:", error);
      res.status(500).json({ error: "Failed to upload alerts" });
    }
  });

  // LLM-powered intelligent data upload endpoint
  app.post("/api/data/smart-upload", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Expected non-empty array of data" });
      }

      // Use LLM to analyze and extract data
      const extractionResult = await dataExtractor.analyzeAndExtractData(data);
      
      if (extractionResult.dataType === 'unknown') {
        return res.status(400).json({ 
          error: "Unable to determine data type",
          issues: extractionResult.issues,
          suggestion: "Please manually specify the data type or check the data format"
        });
      }

      let count = 0;
      const errors: string[] = [];

      // Process extracted data based on detected type
      for (const item of extractionResult.extractedData) {
        try {
          if (extractionResult.dataType === 'servers') {
            // Check if server already exists
            const existingServer = item.hostname ? await storage.getServerByHostname(item.hostname) : null;
            if (!existingServer) {
              await storage.createServer({
                hostname: item.hostname,
                ipAddress: item.ipAddress,
                environment: item.environment || 'production',
                status: item.status || 'healthy',
                location: item.location
              });
              count++;
            }
          } else if (extractionResult.dataType === 'metrics') {
            // Find server by hostname if serverId not provided
            if (!item.serverId && item.hostname) {
              const server = await storage.getServerByHostname(item.hostname);
              if (server) {
                item.serverId = server.id;
              }
            }

            if (item.serverId) {
              await storage.addServerMetrics({
                serverId: item.serverId,
                cpuUsage: (parseFloat(item.cpuUsage) || 0).toString(),
                memoryUsage: (parseFloat(item.memoryUsage) || 0).toString(),
                diskUsage: (parseFloat(item.diskUsage) || 0).toString(),
                networkIn: parseFloat(item.networkIn) || 0,
                networkOut: parseFloat(item.networkOut) || 0,
                timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
              });
              count++;
            } else {
              errors.push(`Metrics for ${item.hostname || 'unknown host'}: Server not found`);
            }
          } else if (extractionResult.dataType === 'alerts') {
            // Find server by hostname if serverId not provided
            if (!item.serverId && item.hostname) {
              const server = await storage.getServerByHostname(item.hostname);
              if (server) {
                item.serverId = server.id;
              }
            }

            if (item.serverId) {
              await storage.createAlert({
                serverId: item.serverId,
                title: item.title,
                description: item.description,
                severity: item.severity === 'critical' ? 'critical' : item.severity === 'warning' ? 'warning' : 'info',
                status: item.status === 'resolved' ? 'resolved' : item.status === 'acknowledged' ? 'acknowledged' : 'active',
                metricType: item.metricType || 'system'
              });
              count++;
            } else {
              errors.push(`Alert '${item.title}': Server not found`);
            }
          }
        } catch (error) {
          console.error(`Error processing ${extractionResult.dataType} item:`, error);
          errors.push(`Failed to process item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Notify WebSocket clients of new data
      if (count > 0) {
        wsManager.broadcast({
          type: 'data_upload',
          data: {
            dataType: extractionResult.dataType,
            count,
            timestamp: new Date()
          }
        });
      }

      res.json({ 
        success: true,
        dataType: extractionResult.dataType,
        confidence: extractionResult.confidence,
        count,
        total: extractionResult.extractedData.length,
        mappings: extractionResult.mappings,
        issues: extractionResult.issues,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully processed ${count} ${extractionResult.dataType} records with ${extractionResult.confidence * 100}% confidence`
      });
    } catch (error) {
      console.error("Error in smart data upload:", error);
      res.status(500).json({ 
        error: "Failed to process data upload",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/integrations/external", async (req, res) => {
    try {
      const { endpoint, apiKey } = req.body;
      
      // Simple validation - in real implementation you'd test the actual connection
      if (!endpoint || !apiKey) {
        return res.status(400).json({ error: "Both endpoint and API key are required" });
      }

      // Store integration config (you could save this to database)
      res.json({ success: true, message: "External data source connected successfully" });
    } catch (error) {
      console.error("Error connecting external source:", error);
      res.status(500).json({ error: "Failed to connect external data source" });
    }
  });

  app.post("/api/agents/test", async (req, res) => {
    try {
      // Trigger a test cycle for all agents
      console.log("Starting agent test cycle...");
      
      // Send WebSocket notification about test start
      wsManager.broadcast({
        type: 'agent_test_started',
        message: 'Agent testing cycle initiated'
      });

      res.json({ success: true, message: "Agent test cycle initiated" });
    } catch (error) {
      console.error("Error starting agent test:", error);
      res.status(500).json({ error: "Failed to start agent test" });
    }
  });

  // Data management endpoints
  app.delete("/api/servers/:id", async (req, res) => {
    try {
      await storage.deleteServer(req.params.id);
      res.json({ success: true, message: "Server deleted successfully" });
    } catch (error) {
      console.error("Error deleting server:", error);
      res.status(500).json({ error: "Failed to delete server" });
    }
  });

  app.post("/api/metrics/clear", async (req, res) => {
    try {
      await storage.clearAllMetrics();
      res.json({ success: true, message: "All metrics cleared successfully" });
    } catch (error) {
      console.error("Error clearing metrics:", error);
      res.status(500).json({ error: "Failed to clear metrics" });
    }
  });

  app.get("/api/export/:dataType", async (req, res) => {
    try {
      const { dataType } = req.params;
      let data: any;

      switch (dataType) {
        case 'servers':
          data = await storage.getAllServers();
          break;
        case 'metrics':
          data = await storage.getLatestMetrics();
          break;
        case 'alerts':
          data = await storage.getAllAlerts();
          break;
        case 'agents':
          data = await storage.getAllAgents();
          break;
        default:
          return res.status(400).json({ error: "Invalid data type" });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${dataType}_export_${new Date().toISOString().split('T')[0]}.json`);
      res.json(data);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Agent Settings endpoints
  app.get("/api/agent-settings", async (req, res) => {
    try {
      const settings = await storage.getAgentSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching agent settings:", error);
      res.status(500).json({ error: "Failed to fetch agent settings" });
    }
  });

  app.put("/api/agent-settings", async (req, res) => {
    try {
      const settingsData = req.body;
      
      const existingSettings = await storage.getAgentSettingsByAgentId(settingsData.agentId);
      
      let settings;
      if (existingSettings) {
        settings = await storage.updateAgentSettings(settingsData.agentId, settingsData);
      } else {
        settings = await storage.createAgentSettings(settingsData);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating agent settings:", error);
      res.status(500).json({ error: "Failed to update agent settings" });
    }
  });

  // Start the agent manager
  agentManager.start();

  return httpServer;
}
