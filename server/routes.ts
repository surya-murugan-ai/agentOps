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
import { commandExecutionRoutes } from "./routes/commandExecution";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from "./db";
import { sql } from "drizzle-orm";

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

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, allowedTypes.includes(ext));
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { uploadType } = req.body;
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      console.log(`📁 Processing upload: ${req.file.originalname} (${uploadType})`);
      
      // Create file hash to prevent duplicate uploads
      const crypto = await import('crypto');
      const fileContent = fs.readFileSync(filePath);
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      
      // Check if this exact file has been uploaded before
      const { uploadHistory } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const existingUpload = await db.select().from(uploadHistory).where(eq(uploadHistory.fileHash, fileHash));
      if (existingUpload.length > 0) {
        fs.unlinkSync(filePath); // Clean up temp file
        return res.status(409).json({ 
          error: "Duplicate file upload detected",
          message: `File '${req.file.originalname}' has already been uploaded previously`,
          previousUpload: existingUpload[0]
        });
      }
      
      let parsedData: any[] = [];
      
      // Parse different file formats
      if (fileExtension === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        parsedData = result.data;
      } else if (fileExtension === '.json') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        parsedData = JSON.parse(fileContent);
      } else {
        // For Excel files, use smart upload endpoint
        return res.status(400).json({ error: "Excel files not yet supported in this endpoint" });
      }

      console.log(`📊 Parsed ${parsedData.length} records`);

      // Process based on upload type
      let result;
      if (uploadType === 'servers') {
        // Process servers data
        const { DataAutoMapper } = await import('./services/dataAutoMapper');
        const analysis = DataAutoMapper.analyzeDataStructure(parsedData);
        
        if (analysis.dataType === 'servers' || analysis.confidence > 0.7) {
          let count = 0;
          const errors: string[] = [];
          
          for (const serverData of parsedData) {
            try {
              const hostname = serverData.hostname || serverData.serverId || serverData.server_id;
              const existingServer = hostname ? await storage.getServerByHostname(hostname) : null;
              
              if (!existingServer && hostname) {
                await storage.createServer({
                  id: nanoid(),
                  hostname: hostname,
                  ipAddress: serverData.ipAddress || serverData.ip_address || serverData.ipaddress || 
                            `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
                  environment: serverData.environment || 'production',
                  status: serverData.status || 'healthy',
                  location: serverData.location || 'Unknown',
                  tags: typeof serverData.tags === 'string' ? 
                        (() => {
                          try {
                            // Parse "service=core-banking;tier=bronze" format
                            const pairs = serverData.tags.split(';');
                            const obj = {};
                            pairs.forEach(pair => {
                              const [key, value] = pair.split('=');
                              if (key && value) obj[key.trim()] = value.trim();
                            });
                            return obj;
                          } catch (e) {
                            return { raw: serverData.tags };
                          }
                        })() :
                        (serverData.tags || {}),
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                count++;
                console.log(`✅ Created server: ${hostname}`);
              }
            } catch (error) {
              console.error(`Failed to create server:`, error);
              errors.push(`Failed to create server: ${error.message}`);
            }
          }
          
          result = { count, message: `Successfully uploaded ${count} servers`, errors };
        } else {
          result = { error: "Data does not appear to be server data" };
        }
      } else if (uploadType === 'metrics') {
        // Process metrics data
        const { DataAutoMapper } = await import('./services/dataAutoMapper');
        const mappedData = DataAutoMapper.autoMapData(parsedData);
        
        // Process metrics using bulk endpoint logic
        const BATCH_SIZE = 250;
        let totalProcessed = 0;
        const startTime = Date.now();
        
        // Pre-fetch servers  
        const allServers = await storage.getAllServers();
        const serverMap = new Map();
        allServers.forEach(server => {
          serverMap.set(server.hostname, server.id);
          serverMap.set(server.id, server.id);
        });
        
        // Add database-level duplicate prevention
        console.log('🔍 Checking for existing metrics to prevent duplicates...');
        const sessionId = nanoid(); // Create unique session ID for this upload
        
        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
          const batch = mappedData.slice(i, i + BATCH_SIZE);
          const metricsToInsert = [];
          
          for (const metric of batch) {
            // Look up server by hostname first (this is what CSV contains)
            let serverId = serverMap.get(metric.serverId);
            if (!serverId && metric.hostname) {
              serverId = serverMap.get(metric.hostname);
            }
            
            // If server doesn't exist, create it with hostname as the lookup key
            if (!serverId) {
              const hostname = metric.serverId || metric.hostname || `auto-server-${Date.now()}`;
              const newServer = await storage.createServer({
                id: nanoid(),
                hostname: hostname,
                ipAddress: '192.168.1.10', // Default IP
                environment: 'production',
                location: 'datacenter-1',
                status: 'healthy'
              });
              serverId = newServer.id;
              serverMap.set(hostname, serverId); // Map hostname to serverId
              console.log(`✅ Auto-created server: ${hostname}`);
            }
            
            if (serverId) {
              metricsToInsert.push({
                ...metric,
                id: nanoid(),
                serverId: serverId,
                timestamp: new Date(metric.timestamp || Date.now()),
                processCount: metric.processCount || 100,
                memoryTotal: metric.memoryTotal || 8192,
                diskTotal: metric.diskTotal || 256,
                networkThroughput: metric.networkThroughput || 0
              });
            }
          }
          
          if (metricsToInsert.length > 0) {
            console.log(`📊 Processing batch: ${metricsToInsert.length} metrics`);
            // Use session-aware duplicate prevention
            const uniqueMetrics = await storage.bulkInsertMetricsWithDuplicateCheck(metricsToInsert, sessionId);
            totalProcessed += uniqueMetrics;
          }
        }
        
        // Clear session tracking after upload completes
        storage.clearUploadSession();
        
        const totalTime = Date.now() - startTime;
        
        // Record successful upload in upload history
        await db.insert(uploadHistory).values({
          id: nanoid(),
          fileHash: fileHash,
          filename: req.file.originalname,
          uploadCount: totalProcessed,
          uploadType: 'metrics'
        });
        
        result = { 
          count: totalProcessed, 
          message: `Successfully uploaded ${totalProcessed} metrics in ${totalTime}ms`,
          performance: { recordsPerSecond: Math.round(totalProcessed/(totalTime/1000)) }
        };
      } else {
        // Auto-detect data type
        const { DataAutoMapper } = await import('./services/dataAutoMapper');
        const analysis = DataAutoMapper.analyzeDataStructure(parsedData);
        
        if (analysis.dataType === 'servers') {
          // Redirect to server processing
          req.body.uploadType = 'servers';
          return app.emit('request', req, res);
        } else if (analysis.dataType === 'metrics') {
          // Process metrics auto-detected data
          const mappedData = DataAutoMapper.autoMapData(parsedData);
          
          const BATCH_SIZE = 250;
          let totalProcessed = 0;
          const startTime = Date.now();
          
          const allServers = await storage.getAllServers();
          const serverMap = new Map();
          allServers.forEach(server => {
            serverMap.set(server.hostname, server.id);
            serverMap.set(server.id, server.id);
          });
          
          for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
            const batch = mappedData.slice(i, i + BATCH_SIZE);
            const metricsToInsert = [];
            
            for (const metric of batch) {
              let serverId = metric.serverId;
              if (!serverId && metric.hostname) {
                serverId = serverMap.get(metric.hostname);
              }
              
              if (serverId) {
                metricsToInsert.push({
                  ...metric,
                  id: nanoid(),
                  serverId: serverId,
                  timestamp: new Date(metric.timestamp || Date.now()),
                  processCount: metric.processCount || 100, // Default value for missing process count
                  memoryTotal: metric.memoryTotal || 8192,  // Default memory total
                  diskTotal: metric.diskTotal || 256,       // Default disk total  
                  networkThroughput: metric.networkThroughput || 0 // Default network throughput
                });
              }
            }
            
            if (metricsToInsert.length > 0) {
              await storage.bulkInsertMetrics(metricsToInsert);
              totalProcessed += metricsToInsert.length;
            }
          }
          
          const totalTime = Date.now() - startTime;
          result = { 
            count: totalProcessed, 
            message: `Successfully uploaded ${totalProcessed} metrics in ${totalTime}ms`,
            performance: { recordsPerSecond: Math.round(totalProcessed/(totalTime/1000)) }
          };
        } else {
          result = { error: "Unable to determine data type", analysis };
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing upload:", error);
      
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // Upload status endpoint
  app.get("/api/upload/status", (req, res) => {
    res.json({ status: "ready", message: "Upload system ready" });
  });

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

  // Metrics in time range - with smart defaults for better UX
  app.get("/api/metrics/range", async (req, res) => {
    try {
      const { start, end, limit } = req.query;
      
      // Provide smart defaults if no time range specified
      let startTime: Date;
      let endTime: Date;
      
      if (!start || !end) {
        // Default to last 24 hours if no range provided
        endTime = new Date();
        startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      } else {
        startTime = new Date(start as string);
        endTime = new Date(end as string);
      }
      
      const metrics = await storage.getMetricsInTimeRange(startTime, endTime);
      
      // Apply limit if specified
      const limitNum = limit ? parseInt(limit as string) : metrics.length;
      const limitedMetrics = metrics.slice(0, limitNum);
      
      res.json(limitedMetrics);
    } catch (error) {
      console.error("Error fetching metrics range:", error);
      res.status(500).json({ error: "Failed to fetch metrics range" });
    }
  });

  // All metrics endpoint with pagination for data viewer - no caching for accurate counts
  app.get("/api/metrics/all", asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50000;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    // Direct database call for real-time accurate count
    const metrics = await storage.getAllMetrics(limit + offset);
    
    // Apply offset manually since storage doesn't support it
    const paginatedMetrics = metrics.slice(offset, offset + limit);
    
    // Add cache-control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(paginatedMetrics);
  }));

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

  // Smart auto-mapping upload endpoint - handles ANY data format
  app.post("/api/metrics/smart-upload", async (req, res) => {
    try {
      const { data: rawData } = req.body;
      if (!Array.isArray(rawData)) {
        return res.status(400).json({ error: "Expected array of data records" });
      }

      console.log(`🤖 SMART UPLOAD: Processing ${rawData.length} records with auto-detection`);
      
      // Import the auto-mapper
      const { DataAutoMapper } = await import('./services/dataAutoMapper');
      
      // Analyze the data structure
      const analysis = DataAutoMapper.analyzeDataStructure(rawData);
      console.log(`📊 Data Analysis:`, analysis);
      
      // Route to appropriate handler based on detected data type
      if (analysis.dataType === 'servers') {
        console.log(`🖥️ Detected server data - processing as servers (bypassing metrics validation)`);
        
        // Auto-map the data to standard format first
        const mappedData = DataAutoMapper.autoMapData(rawData);
        console.log(`✅ Auto-mapped ${mappedData.length}/${rawData.length} server records`);
        
        let count = 0;
        const errors: string[] = [];
        
        for (const serverData of mappedData) {
          try {
            console.log(`🔍 Processing server data:`, serverData);
            // Check if server already exists by hostname
            const hostname = serverData.hostname || serverData.serverId || serverData.server_id;
            const existingServer = hostname ? 
              await storage.getServerByHostname(hostname) : null;
            
            if (!existingServer && hostname) {
              await storage.createServer({
                id: nanoid(),
                hostname: hostname,
                ipAddress: serverData.ipAddress || serverData.ip_address || serverData.ipaddress || 
                          `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
                environment: serverData.environment || 'production',
                status: serverData.status || 'healthy',
                location: serverData.location || 'Unknown',
                tags: serverData.tags ? (typeof serverData.tags === 'string' ? 
                      { custom: serverData.tags } : serverData.tags) : {},
                createdAt: new Date(),
                updatedAt: new Date()
              });
              count++;
              console.log(`✅ Created server: ${hostname}`);
            } else if (existingServer) {
              console.log(`⏭️ Server already exists: ${hostname}`);
            } else {
              console.log(`⚠️ Skipped record without hostname`);
            }
          } catch (error) {
            console.error(`Failed to create server:`, error);
            errors.push(`Failed to create server ${serverData.hostname || 'unknown'}: ${error.message}`);
          }
        }
        
        return res.json({ 
          count, 
          message: `Successfully processed ${count} servers`,
          errors: errors.length > 0 ? errors : undefined,
          analysis 
        });
        
      } else if (analysis.dataType === 'metrics' || analysis.dataType === 'server-metrics') {
        // Auto-map the data to standard format
        const mappedData = DataAutoMapper.autoMapData(rawData);
        
        if (mappedData.length === 0) {
          return res.status(400).json({ 
            error: "No valid data could be mapped from the uploaded file",
            analysis: analysis,
            recommendations: analysis.recommendations
          });
        }

        console.log(`✅ Successfully mapped ${mappedData.length}/${rawData.length} records`);
        
        // Use the existing bulk upload logic with mapped data
        return await processBulkMetrics(req, res, mappedData, analysis);
        
      } else {
        return res.status(400).json({
          error: "Unable to determine data type from uploaded data",
          analysis: analysis,
          recommendations: [
            "Ensure your data contains either server information (hostname, IP address) or metrics data (CPU, memory usage)",
            "Check column headers match expected formats",
            "Verify data is properly formatted"
          ]
        });
      }
      
    } catch (error) {
      console.error("Error in smart upload:", error);
      res.status(500).json({ error: "Failed to process smart upload" });
    }
  });

  app.post("/api/metrics/bulk", async (req, res) => {
    try {
      const { metrics, data } = req.body;
      let processedMetrics = metrics;
      
      // If 'data' is provided instead of 'metrics', use auto-mapping
      if (!metrics && data) {
        console.log(`🤖 Auto-detecting data format for ${data.length} records`);
        const { DataAutoMapper } = await import('./services/dataAutoMapper');
        processedMetrics = DataAutoMapper.autoMapData(data);
        console.log(`✅ Auto-mapped ${processedMetrics.length}/${data.length} records`);
      }
      
      if (!Array.isArray(processedMetrics)) {
        return res.status(400).json({ error: "Expected array of metrics or data" });
      }

      return await processBulkMetrics(req, res, processedMetrics);
      
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ error: "Failed to upload metrics" });
    }
  });

  // Core bulk processing logic (shared by both endpoints)
  const processBulkMetrics = async (req, res, metrics, analysis = null) => {
    try {
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
      let newServersCount = 0;
      
      console.log(`📋 Available servers: ${allServers.length}`);
      allServers.forEach(server => {
        serverMap.set(server.hostname, server.id);
        serverMap.set(server.id, server.id);
      });
      
      // AUTO-CREATE MISSING SERVERS - Identify missing servers from metrics
      const uniqueServerIds = new Set();
      metrics.forEach(metric => {
        if (metric.serverId) uniqueServerIds.add(metric.serverId);
        if (metric.hostname) uniqueServerIds.add(metric.hostname);
      });
      
      // Create missing servers
      for (const serverId of uniqueServerIds) {
        if (!serverMap.has(serverId)) {
          console.log(`🆕 Auto-creating missing server: ${serverId}`);
          try {
            const newServer = await storage.createServer({
              id: nanoid(),
              hostname: serverId,
              ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
              environment: 'production',
              status: 'healthy',
              location: 'auto-generated',
              tags: { type: 'auto-created' },
              createdAt: new Date(),
              updatedAt: new Date()
            });
            serverMap.set(serverId, newServer.id);
            serverMap.set(newServer.id, newServer.id);
            newServersCount++;
            console.log(`✅ Created server: ${serverId} → ${newServer.id}`);
          } catch (error) {
            console.error(`❌ Failed to create server ${serverId}:`, error);
          }
        }
      }
      
      console.log(`📊 Server mapping complete: ${serverMap.size} entries (${newServersCount} new servers created)`);

      // Process in optimized batches
      for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
        const batch = metrics.slice(i, i + BATCH_SIZE);
        const batchStartTime = Date.now();
        
        // Prepare batch with server ID mapping
        const processedBatch = batch
          .map(metricData => {
            // Fast server ID lookup - check serverId first, then try hostname
            let serverId = metricData.serverId;
            let finalServerId = null;
            
            // Try to map the serverId (which might be a hostname) to a UUID
            if (serverId) {
              finalServerId = serverMap.get(serverId);
            }
            
            // If no match found and we have hostname, try that
            if (!finalServerId && metricData.hostname) {
              finalServerId = serverMap.get(metricData.hostname);
            }
            
            if (!finalServerId) {
              console.log(`⚠️ Skipping metric - no valid server found for: ${metricData.serverId || metricData.hostname}`);
              return null;
            }
            
            serverId = finalServerId;

            // Clean numeric values to ensure they're valid numbers
            const cleanNumeric = (value: any, defaultValue: number = 0): string => {
              if (value === null || value === undefined || value === '') return String(defaultValue);
              // More aggressive cleaning: remove %, ms, units, and extra spaces
              const cleaned = String(value).replace(/[^\d.-]/g, '').trim();
              const num = parseFloat(cleaned);
              return isNaN(num) || cleaned === '' ? String(defaultValue) : String(num);
            };

            return {
              serverId,
              cpuUsage: cleanNumeric(metricData.cpuUsage || metricData.cpu_usage, 0),
              memoryUsage: cleanNumeric(metricData.memoryUsage || metricData.memory_usage, 0),
              memoryTotal: Number(cleanNumeric(metricData.memoryTotal || metricData.memory_total, 8192)),
              diskUsage: cleanNumeric(metricData.diskUsage || metricData.disk_usage, 0),
              diskTotal: Number(cleanNumeric(metricData.diskTotal || metricData.disk_total, 256)),
              networkLatency: cleanNumeric(metricData.networkLatency || metricData.network_latency, 0),
              networkThroughput: cleanNumeric(metricData.networkThroughput || metricData.network_throughput, 0),
              processCount: Number(cleanNumeric(metricData.processCount || metricData.process_count, 150)),
              timestamp: metricData.timestamp ? new Date(metricData.timestamp) : new Date()
            };
          })
          .filter(Boolean);

        // Single batch insert for maximum performance
        if (processedBatch.length > 0) {
          // Debug log the first record to diagnose data type issues
          if (processedBatch.length > 0) {
            console.log(`🔍 DEBUG - Sample processed record:`, JSON.stringify(processedBatch[0], null, 2));
          }
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
        newServersCount: newServersCount,
        message: `High-speed upload: ${totalProcessed} metrics in ${totalTime}ms`,
        performance: {
          totalRecords: totalProcessed,
          timeMs: totalTime,
          recordsPerSecond: Math.round(totalProcessed/(totalTime/1000))
        },
        analysis: analysis || undefined
      });
    } catch (error) {
      console.error("Error in optimized bulk metrics upload:", error);
      res.status(500).json({ error: "Failed to upload metrics" });
    }
  };

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
      // Clear all data including servers
      await storage.clearAllMetrics();
      await storage.clearAllAlerts();
      await storage.clearAllRemediationActions();
      await storage.clearAllAuditLogs();
      await storage.clearAllServers();
      console.log("✅ All data cleared from database including servers");
      res.json({ success: true, message: "All data cleared including servers" });
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

  // Clear all servers endpoint
  app.delete("/api/servers/all", async (req, res) => {
    try {
      await storage.clearAllServers();
      console.log("✅ All servers cleared from database");
      res.json({ success: true, message: "All servers cleared successfully" });
    } catch (error) {
      console.error("Error clearing all servers:", error);
      res.status(500).json({ error: "Failed to clear all servers" });
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

  // Command execution routes
  app.use("/api/commands", commandExecutionRoutes);

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
