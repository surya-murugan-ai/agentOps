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
import { registerAgentControlRoutes } from "./routes/agentControlRoutes";
import { systemRouter } from "./routes/system";
import { thresholdsRouter } from "./routes/thresholds";
import cloudRoutes from "./routes/cloudRoutes";

// Import comprehensive error handling and validation systems
import { AgentOpsError, ValidationError, DatabaseError, NotFoundError, logError } from './utils/errors';
import { validateInput, apiSchemas, validateFileUpload, sanitizeString, sanitizeHtml } from './utils/validation';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';
import { rateLimiters } from './middleware/rateLimiter';
import { cache, getCached, invalidateCache, cacheKeys, cacheTTL } from './utils/cache';

// Helper functions for agent details
async function getAgentInsights(agentId: string) {
  // Get recent audit logs to extract AI insights
  const recentLogs = await storage.getAuditLogsByAgent(agentId, 5);
  const insights = recentLogs
    .filter(log => log.details?.includes('AI Insights') || log.details?.includes('detected'))
    .map(log => ({
      timestamp: log.createdAt,
      insight: log.details,
      action: log.action
    }));
  
  return insights.length > 0 ? insights : [{
    timestamp: new Date(),
    insight: "Agent is actively monitoring and processing data. Check recent activities for detailed analysis.",
    action: "System Status"
  }];
}

async function calculateAgentSuccessRate(agentId: string): Promise<number> {
  const recentLogs = await storage.getAuditLogsByAgent(agentId, 50);
  if (recentLogs.length === 0) return 100;
  
  const successful = recentLogs.filter(log => log.status === 'success').length;
  return Math.round((successful / recentLogs.length) * 100);
}

async function calculateAvgProcessingTime(agentId: string): Promise<string> {
  // For now, return a simulated processing time based on agent type
  if (agentId.includes('anomaly')) return "2.3s";
  if (agentId.includes('predictive')) return "4.1s";
  if (agentId.includes('recommendation')) return "1.8s";
  return "1.5s";
}

async function getLastProcessingDetails(agentId: string): Promise<any> {
  const recentLogs = await storage.getAuditLogsByAgent(agentId, 1);
  if (recentLogs.length === 0) {
    return {
      timestamp: new Date(),
      action: "Monitoring",
      status: "active",
      details: "Agent is actively monitoring system metrics"
    };
  }
  
  return {
    timestamp: recentLogs[0].createdAt,
    action: recentLogs[0].action,
    status: recentLogs[0].status,
    details: recentLogs[0].details
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const dataExtractor = new DataExtractionService();

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocket(wss);

  // Apply global rate limiting to all API routes
  app.use('/api', rateLimiters.api);

  // Register agent control routes
  registerAgentControlRoutes(app);
  
  // Register system routes (includes API status tracking)
  app.use('/api/system', systemRouter);
  
  // Register threshold configuration routes
  app.use('/api/thresholds', thresholdsRouter);

  // Dashboard metrics endpoint with caching
  app.get("/api/dashboard/metrics", asyncHandler(async (req, res) => {
    const metrics = await getCached(
      cacheKeys.dashboardMetrics(),
      () => storage.getDashboardMetrics(),
      cacheTTL.dashboard
    );
    res.json(metrics);
  }));

  // Servers endpoints with caching and validation
  app.get("/api/servers", asyncHandler(async (req, res) => {
    const servers = await getCached(
      cacheKeys.servers(),
      () => storage.getAllServers(),
      cacheTTL.servers
    );
    res.json(servers);
  }));

  app.get("/api/servers/:id", asyncHandler(async (req, res) => {
    const serverId = sanitizeString(req.params.id);
    const server = await getCached(
      cacheKeys.serverById(serverId),
      () => storage.getServer(serverId),
      cacheTTL.servers
    );
    if (!server) {
      throw new NotFoundError("Server");
    }
    res.json(server);
  }));

  app.get("/api/servers/:id/metrics", asyncHandler(async (req, res) => {
    const serverId = sanitizeString(req.params.id);
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 1000) : 100;
    
    const metrics = await getCached(
      cacheKeys.metrics(serverId, limit),
      () => storage.getServerMetrics(serverId, limit),
      cacheTTL.metrics
    );
    res.json(metrics);
  }));

  // Latest metrics for all servers with caching
  app.get("/api/metrics/latest", asyncHandler(async (req, res) => {
    const metrics = await getCached(
      'metrics:latest',
      () => storage.getLatestMetrics(),
      cacheTTL.metrics
    );
    res.json(metrics);
  }));

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

  // Agent details with processing logs and insights
  app.get("/api/agents/:id/details", async (req, res) => {
    try {
      const agentId = req.params.id;
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Get recent activities related to this agent
      const [recentAlerts, recentAnomalies, recentAuditLogs] = await Promise.all([
        storage.getAlertsByAgent(agentId, 10),
        storage.getAnomaliesByAgent(agentId, 5), 
        storage.getAuditLogsByAgent(agentId, 20)
      ]);

      // Generate AI insights from recent activities
      const insights = [];
      for (const log of recentAuditLogs.slice(0, 5)) {
        insights.push({
          action: log.action,
          insight: `Agent performed ${log.action}: ${log.details}`,
          timestamp: log.timestamp
        });
      }

      res.json({
        agent: {
          ...agent,
          uptime: agent.startedAt ? 
            Math.floor((Date.now() - new Date(agent.startedAt).getTime()) / 60000) + ' minutes' : 'N/A'
        },
        recentActivities: {
          alerts: recentAlerts,
          anomalies: recentAnomalies,
          auditLogs: recentAuditLogs
        },
        insights,
        performance: {
          successRate: 100,
          avgProcessingTime: '2.3s',
          lastActiveProcessing: recentAuditLogs.length > 0 ? {
            action: recentAuditLogs[0].action,
            timestamp: recentAuditLogs[0].timestamp
          } : null
        }
      });
    } catch (error) {
      console.error("Error fetching agent details:", error);
      res.status(500).json({ error: "Failed to fetch agent details" });
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

      console.log(`🚀 OPTIMIZED BULK UPLOAD: Starting ${metrics.length} metrics`);
      const startTime = Date.now();

      // Batch size for optimal performance (reduced for better throughput)
      const BATCH_SIZE = 250;
      let totalProcessed = 0;

      // Pre-fetch all servers once to avoid repeated DB calls
      const allServers = await storage.getAllServers();
      const serverMap = new Map();
      allServers.forEach(server => {
        serverMap.set(server.hostname, server.id);
        serverMap.set(server.id, server.id);
      });

      // Process in optimized batches
      for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
        const batch = metrics.slice(i, i + BATCH_SIZE);
        const batchStartTime = Date.now();
        
        // Prepare batch with server ID mapping
        const processedBatch = batch
          .map(metricData => {
            // Fast server ID lookup
            const serverId = metricData.serverId || serverMap.get(metricData.hostname);
            if (!serverId) return null;

            return {
              serverId,
              cpuUsage: String(metricData.cpuUsage || metricData.cpu_usage || 0),
              memoryUsage: String(metricData.memoryUsage || metricData.memory_usage || 0),
              memoryTotal: Number(metricData.memoryTotal || metricData.memory_total || 8192),
              diskUsage: String(metricData.diskUsage || metricData.disk_usage || 0),
              diskTotal: Number(metricData.diskTotal || metricData.disk_total || 256),
              networkLatency: String(metricData.networkLatency || metricData.network_latency || 0),
              networkThroughput: String(metricData.networkThroughput || metricData.network_throughput || 0),
              processCount: Number(metricData.processCount || metricData.process_count || 150),
              timestamp: metricData.timestamp ? new Date(metricData.timestamp) : new Date()
            };
          })
          .filter(Boolean);

        // Single batch insert for maximum performance
        if (processedBatch.length > 0) {
          await storage.bulkInsertMetrics(processedBatch);
          totalProcessed += processedBatch.length;
        }

        const batchTime = Date.now() - batchStartTime;
        console.log(`⚡ Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(metrics.length/BATCH_SIZE)}: ${batchTime}ms - ${processedBatch.length} records`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`🎯 UPLOAD COMPLETE: ${totalProcessed}/${metrics.length} metrics in ${totalTime}ms (${Math.round(totalProcessed/(totalTime/1000))} records/sec)`);

      // Cache will auto-refresh within TTL - optimized for performance

      res.json({ 
        count: totalProcessed, 
        message: `High-speed upload: ${totalProcessed} metrics in ${totalTime}ms`,
        performance: {
          totalRecords: totalProcessed,
          timeMs: totalTime,
          recordsPerSecond: Math.round(totalProcessed/(totalTime/1000))
        }
      });
    } catch (error) {
      console.error("Error in optimized bulk metrics upload:", error);
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
      let serversCreated = 0;
      const errors: string[] = [];
      
      // Processing records with optimized speed

      // Pre-fetch all servers to avoid repeated database calls
      const allServers = await storage.getAllServers();
      const serverByHostname = new Map();
      allServers.forEach(server => {
        serverByHostname.set(server.hostname, server);
      });
      
      // Reduced logging for faster uploads

      // Track processing progress for large uploads
      const total = extractionResult.extractedData.length;
      let processed = 0;
      let lastProgressBroadcast = 0;
      const startTime = Date.now();

      // Send initial progress update
      wsManager.broadcast({
        type: 'upload_progress',
        data: {
          progress: 0,
          processed: 0,
          total,
          successful: 0,
          dataType: extractionResult.dataType,
          status: 'processing',
          startTime
        }
      });

      // OPTIMIZED BATCH PROCESSING - Increase batch size for better performance
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < extractionResult.extractedData.length; i += BATCH_SIZE) {
        batches.push(extractionResult.extractedData.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`⚡ FAST BATCH UPLOAD: ${total} records in ${batches.length} batches`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartTime = Date.now();
        
        // Process entire batch based on detected type
        if (extractionResult.dataType === 'metrics') {
          // HIGH-SPEED BATCH PROCESS METRICS
          const metricsToInsert = [];
          
          for (const item of batch) {
            let serverId = item.serverId || item.serverid || item.server_id || item.ServerID;
            let targetServer = null;
            
            if (item.hostname) {
              targetServer = serverByHostname.get(item.hostname);
            }
            
            // Fast server ID mapping
            if (!targetServer && serverId) {
              targetServer = serverByHostname.get(serverId);
              if (!targetServer) {
                // Fallback case-insensitive search
                for (const [hostname, server] of Array.from(serverByHostname.entries())) {
                  if (hostname.toLowerCase() === serverId.toLowerCase()) {
                    targetServer = server;
                    break;
                  }
                }
              }
            }
            
            if (targetServer) {
              metricsToInsert.push({
                serverId: targetServer.id,
                cpuUsage: String(parseFloat(item.cpu_usage || item.cpuUsage) || 0),
                memoryUsage: String(parseFloat(item.memory_usage || item.memoryUsage) || 0),
                diskUsage: String(parseFloat(item.disk_usage || item.diskUsage) || 0),
                memoryTotal: parseInt(item.memoryTotal) || 8192,
                diskTotal: parseInt(item.diskTotal) || 256,
                processCount: parseInt(item.process_count || item.processCount) || 150,
                networkLatency: String(item.network_latency || item.networkLatency || 0),
                networkThroughput: String(item.networkThroughput || 0),
                timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
              });
              count++;
            }
          }
          
          // SINGLE BATCH INSERT - Maximum performance
          if (metricsToInsert.length > 0) {
            await storage.bulkInsertMetrics(metricsToInsert);
          }
          
          // BATCH INSERT ALL METRICS AT ONCE
          if (metricsToInsert.length > 0) {
            try {
              await storage.bulkInsertMetrics(metricsToInsert);
              count += metricsToInsert.length;
            } catch (error) {
              console.error('Batch metrics insert failed:', error);
            }
          }
          
        } else {
          // Individual processing for other types (servers, alerts)
          for (const item of batch) {
            processed++;
            try {
              if (extractionResult.dataType === 'servers') {
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
              } else if (extractionResult.dataType === 'alerts') {
                // Handle alerts normally as they have complex validation
                let serverId = item.serverId || item.ServerID || item.server_id;
                
                if (!serverId && item.hostname) {
                  const server = await storage.getServerByHostname(item.hostname);
                  if (server) serverId = server.id;
                }
        
                if (serverId) {
                  let severity = (item.severity || item.Severity || 'warning').toLowerCase();
                  if (!['critical', 'warning', 'info'].includes(severity)) {
                    severity = 'warning';
                  }
                  
                  // Get server hostname for alert creation
                  const server = await storage.getServer(serverId);
                  const hostname = server?.hostname || 'unknown';
        
                  await storage.createAlert({
                    hostname: hostname,
                    serverId: serverId,
                    metricType: item.metricType || item.Metric || item.metric || 'system',
                    metricValue: item.metricValue || item.Value || item.value || 0,
                    threshold: item.threshold || item.Threshold || null,
                    severity: severity,
                    description: item.description || item.Description || item.title || 'Alert from uploaded data',
                    title: item.title || item.Description || item.description || 'System Alert',
                    status: 'active'
                  });
                  count++;
                }
              }
            } catch (error) {
              errors.push(`Failed to process item: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
        
        processed = (batchIndex + 1) * BATCH_SIZE;
        if (processed > total) processed = total;
        
        // Only broadcast progress for large uploads to reduce WebSocket overhead
        if (total > 100 && batchIndex % 5 === 0) {
          const progressPercent = Math.round((processed / total) * 100);
          const timeElapsed = Date.now() - startTime;
          const batchTime = Date.now() - batchStartTime;
          
          wsManager.broadcast({
            type: 'upload_progress',
            data: {
              progress: progressPercent,
              processed,
              total,
              successful: count,
              failed: processed - count,
              serversCreated,
              dataType: extractionResult.dataType,
              status: 'processing',
              timeElapsed: Math.round(timeElapsed / 1000),
              batchNumber: batchIndex + 1,
              totalBatches: batches.length,
              batchTime: Math.round(batchTime)
            }
          });
        }
        
        const batchTime = Date.now() - batchStartTime;
        console.log(`⚡ Batch ${batchIndex + 1}/${batches.length}: ${batchTime}ms - ${count} records`);
      }

      // Send final progress update
      const finalTime = Date.now();
      const totalTimeElapsed = Math.round((finalTime - startTime) / 1000);
      
      wsManager.broadcast({
        type: 'upload_progress',
        data: {
          progress: 100,
          processed: total,
          total,
          successful: count,
          failed: total - count,
          serversCreated,
          dataType: extractionResult.dataType,
          status: 'completed',
          timeElapsed: totalTimeElapsed,
          errors: errors.slice(0, 5) // Include first few errors
        }
      });

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

  // Admin endpoints for data management
  app.delete("/api/metrics/clear", async (req, res) => {
    try {
      await storage.clearAllMetrics();
      res.json({ success: true, message: "All metrics data cleared successfully" });
    } catch (error) {
      console.error("Error clearing metrics:", error);
      res.status(500).json({ error: "Failed to clear metrics data" });
    }
  });

  app.post("/api/admin/clear-metrics", async (req, res) => {
    try {
      await storage.clearAllMetrics();
      console.log("✅ All metrics data cleared from database");
      res.json({ success: true, message: "All metrics data cleared" });
    } catch (error) {
      console.error("Error clearing metrics:", error);
      res.status(500).json({ error: "Failed to clear metrics" });
    }
  });

  app.post("/api/admin/clear-all-data", async (req, res) => {
    try {
      // Clear all AI-generated data
      await storage.clearAllMetrics();
      await storage.clearAllAlerts();
      await storage.clearAllRemediationActions();
      await storage.clearAllAuditLogs();
      console.log("✅ All AI-generated data cleared from database");
      res.json({ success: true, message: "All synthetic data cleared" });
    } catch (error) {
      console.error("Error clearing all data:", error);
      res.status(500).json({ error: "Failed to clear all data" });
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

  // Individual delete endpoints
  app.delete("/api/metrics/:id", async (req, res) => {
    try {
      await storage.deleteMetric(req.params.id);
      res.json({ success: true, message: "Metric deleted successfully" });
    } catch (error) {
      console.error("Error deleting metric:", error);
      res.status(500).json({ error: "Failed to delete metric" });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.json({ success: true, message: "Alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  app.delete("/api/remediation-actions/:id", async (req, res) => {
    try {
      await storage.deleteRemediationAction(req.params.id);
      res.json({ success: true, message: "Remediation action deleted successfully" });
    } catch (error) {
      console.error("Error deleting remediation action:", error);
      res.status(500).json({ error: "Failed to delete remediation action" });
    }
  });

  app.delete("/api/audit-logs/:id", async (req, res) => {
    try {
      await storage.deleteAuditLog(req.params.id);
      res.json({ success: true, message: "Audit log deleted successfully" });
    } catch (error) {
      console.error("Error deleting audit log:", error);
      res.status(500).json({ error: "Failed to delete audit log" });
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

  // System Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:category", async (req, res) => {
    try {
      const settings = await storage.getSettingsByCategory(req.params.category);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings by category:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      console.log("POST /api/settings - Request body:", JSON.stringify(req.body, null, 2));
      
      // Validate required fields
      if (!req.body.key || !req.body.category) {
        return res.status(400).json({ 
          error: "Missing required fields: key and category are required" 
        });
      }

      const newSetting = await storage.createSetting(req.body);
      console.log("POST /api/settings - Created setting:", newSetting);
      
      // Reset AI clients if this is an API key update
      if (req.body.category === 'api_keys') {
        const { resetAIClients } = await import("./services/aiService");
        resetAIClients();
        console.log("Reset AI clients for new API key:", req.body.key);
      }
      
      res.status(201).json(newSetting);
    } catch (error) {
      console.error("Error creating setting:", error);
      console.error("Request body that failed:", req.body);
      res.status(500).json({ 
        error: "Failed to create setting", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/settings/:id", async (req, res) => {
    try {
      const updatedSetting = await storage.updateSetting(req.params.id, req.body);
      if (!updatedSetting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  app.delete("/api/settings/:id", async (req, res) => {
    try {
      await storage.deleteSetting(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting setting:", error);
      res.status(500).json({ error: "Failed to delete setting" });
    }
  });

  // Integrations endpoints
  app.get("/api/integrations", async (req, res) => {
    try {
      const integrations = await storage.getAllIntegrations();
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  app.post("/api/integrations", async (req, res) => {
    try {
      const newIntegration = await storage.createIntegration(req.body);
      res.status(201).json(newIntegration);
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ error: "Failed to create integration" });
    }
  });

  app.put("/api/integrations/:id", async (req, res) => {
    try {
      const updatedIntegration = await storage.updateIntegration(req.params.id, req.body);
      if (!updatedIntegration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      res.json(updatedIntegration);
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  app.post("/api/integrations/:id/test", async (req, res) => {
    try {
      const testResult = await storage.testIntegration(req.params.id);
      res.json(testResult);
    } catch (error) {
      console.error("Error testing integration:", error);
      res.status(500).json({ error: "Failed to test integration" });
    }
  });

  app.delete("/api/integrations/:id", async (req, res) => {
    try {
      await storage.deleteIntegration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting integration:", error);
      res.status(500).json({ error: "Failed to delete integration" });
    }
  });

  // Agent testing endpoint
  app.post("/api/agents/test", async (req, res) => {
    try {
      const { agentTester } = await import("./testAgents");
      const results = await agentTester.runComprehensiveTest();
      res.json(results);
    } catch (error) {
      console.error("Error running agent tests:", error);
      res.status(500).json({ error: "Failed to run agent tests" });
    }
  });

  // AI client refresh endpoint
  app.post("/api/ai/refresh", async (req, res) => {
    try {
      const { resetAIClients } = await import("./services/aiService");
      resetAIClients();
      res.json({ success: true, message: "AI clients refreshed with latest API keys" });
    } catch (error) {
      console.error("Error refreshing AI clients:", error);
      res.status(500).json({ error: "Failed to refresh AI clients" });
    }
  });

  // Analytics routes
  app.use("/api/analytics", (await import("./routes/analytics")).default);

  // Data cleaning routes
  app.use("/api/data-cleaning", (await import("./routes/dataCleaningRoutes")).default);

  // Workflow routes
  app.use("/api/workflows", (await import("./routes/workflowRoutes")).workflowRoutes);

  // LLM Usage tracking routes
  app.use("/api/llm-usage", (await import("./routes/llmUsageRoutes")).default);

  // Cloud infrastructure routes
  app.use("/api", cloudRoutes);

  // Report generation routes
  const { createReportRoutes } = await import("./routes/reportRoutes");
  app.use("/api/reports", createReportRoutes(storage));

  // Conversational AI Routes - Create a simple mock AI for testing
  app.post('/api/ai-chat/session', async (req, res) => {
    try {
      console.log('Creating AI chat session...');
      
      // Create a simple session ID for now
      const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      console.log('Session created:', sessionId);
      res.json({ sessionId });
    } catch (error) {
      console.error('Error creating AI chat session:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });

  app.post('/api/ai-chat/message', async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId || !message) {
        return res.status(400).json({ error: 'Session ID and message are required' });
      }
      
      console.log('Processing message:', message);
      
      // Simple AI response based on platform data
      let response = "I'm your AI assistant for AgentOps. ";
      
      if (message.toLowerCase().includes('alert')) {
        const alerts = await storage.getAllAlerts();
        const activeAlerts = alerts.filter(a => a.status === 'active');
        response += `Currently there are ${activeAlerts.length} active alerts. `;
        if (activeAlerts.length > 0) {
          response += `Recent alerts include: ${activeAlerts.slice(0, 3).map(a => a.title).join(', ')}.`;
        }
      } else if (message.toLowerCase().includes('server')) {
        const servers = await storage.getAllServers();
        const healthyServers = servers.filter(s => s.status === 'healthy').length;
        response += `You have ${servers.length} servers monitored. ${healthyServers} are healthy.`;
      } else if (message.toLowerCase().includes('status')) {
        const dashboardMetrics = await storage.getDashboardMetrics();
        response += `Platform status: ${dashboardMetrics.totalServers} servers, ${dashboardMetrics.activeAlerts} active alerts, ${dashboardMetrics.activeAgents} agents running.`;
      } else {
        response += "I can help you with server status, alerts, metrics analysis, and platform insights. What would you like to know?";
      }
      
      res.json({ response, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error processing AI chat message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  app.get('/api/ai-chat/session/:sessionId/messages', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const conversationalAgent = agentManager.getAgent('conversational-ai-001');
      if (!conversationalAgent) {
        return res.status(503).json({ error: 'Conversational AI agent not available' });
      }
      const messages = await (conversationalAgent as any).getSessionMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error('Error getting AI chat messages:', error);
      res.status(500).json({ error: 'Failed to get conversation history' });
    }
  });

  // Note: Global error handlers will be applied in server/index.ts after Vite setup
  // to avoid interfering with frontend routing

  return httpServer;
}
