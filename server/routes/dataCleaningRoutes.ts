import { Router } from "express";
import { dataAgent } from "../agents/dataAgent";
import { z } from "zod";

const router = Router();

// Data cleaning options schema
const cleaningOptionsSchema = z.object({
  removeDuplicates: z.boolean().optional().default(true),
  handleMissingValues: z.boolean().optional().default(true),
  normalizeValues: z.boolean().optional().default(true),
  validateDataTypes: z.boolean().optional().default(true),
  cleanOutliers: z.boolean().optional().default(true)
});

// Clean server data
router.post("/servers", async (req, res) => {
  try {
    const options = cleaningOptionsSchema.parse(req.body);
    console.log("API: Starting server data cleaning with options:", options);
    
    const result = await dataAgent.cleanServerData(options);
    
    res.json({
      success: true,
      data: result,
      message: `Server data cleaned successfully. ${result.duplicatesRemoved} duplicates removed, ${result.missingValuesHandled} missing values handled.`
    });
  } catch (error) {
    console.error("API: Error cleaning server data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Clean metrics data
router.post("/metrics", async (req, res) => {
  try {
    const options = cleaningOptionsSchema.parse(req.body);
    console.log("API: Starting metrics data cleaning with options:", options);
    
    const result = await dataAgent.cleanMetricsData(options);
    
    res.json({
      success: true,
      data: result,
      message: `Metrics data cleaned successfully. ${result.duplicatesRemoved} duplicates removed, ${result.outliersDetected} outliers cleaned.`
    });
  } catch (error) {
    console.error("API: Error cleaning metrics data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Clean alerts data
router.post("/alerts", async (req, res) => {
  try {
    const options = cleaningOptionsSchema.parse(req.body);
    console.log("API: Starting alerts data cleaning with options:", options);
    
    const result = await dataAgent.cleanAlertsData(options);
    
    res.json({
      success: true,
      data: result,
      message: `Alerts data cleaned successfully. ${result.duplicatesRemoved} duplicates removed, ${result.missingValuesHandled} missing values handled.`
    });
  } catch (error) {
    console.error("API: Error cleaning alerts data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Perform comprehensive data cleaning
router.post("/full-clean", async (req, res) => {
  try {
    const options = cleaningOptionsSchema.parse(req.body);
    console.log("API: Starting comprehensive data cleaning with options:", options);
    
    const result = await dataAgent.performFullDataCleaning(options);
    
    res.json({
      success: true,
      data: result,
      message: `Comprehensive data cleaning completed. ${result.summary.totalDuplicatesRemoved} total duplicates removed, ${result.summary.totalMissingValuesHandled} missing values handled, ${result.summary.totalOutliersDetected} outliers detected.`
    });
  } catch (error) {
    console.error("API: Error performing comprehensive data cleaning:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Get data quality summary
router.get("/quality-summary", async (req, res) => {
  try {
    // Get current data counts for quality assessment
    const { storage } = await import("../storage");
    
    const servers = await storage.getAllServers();
    const metrics = await storage.getAllMetrics();
    const alerts = await storage.getAllAlerts();
    
    // Basic quality checks
    const serversWithMissingFields = servers.filter(s => 
      !s.hostname || !s.ipAddress || !s.status || !s.location
    ).length;
    
    const metricsWithNullValues = metrics.filter(m =>
      m.cpuUsage === null || m.memoryUsage === null || m.diskUsage === null
    ).length;
    
    const alertsWithMissingFields = alerts.filter(a =>
      !a.title || !a.description || !a.severity || !a.status
    ).length;
    
    const qualitySummary = {
      servers: {
        total: servers.length,
        withMissingFields: serversWithMissingFields,
        qualityScore: Math.max(0, 100 - (serversWithMissingFields / servers.length * 100))
      },
      metrics: {
        total: metrics.length,
        withNullValues: metricsWithNullValues,
        qualityScore: Math.max(0, 100 - (metricsWithNullValues / metrics.length * 100))
      },
      alerts: {
        total: alerts.length,
        withMissingFields: alertsWithMissingFields,
        qualityScore: Math.max(0, 100 - (alertsWithMissingFields / alerts.length * 100))
      },
      overall: {
        totalRecords: servers.length + metrics.length + alerts.length,
        totalIssues: serversWithMissingFields + metricsWithNullValues + alertsWithMissingFields,
        overallQualityScore: 0
      }
    };
    
    // Calculate overall quality score
    const totalRecords = qualitySummary.overall.totalRecords;
    const totalIssues = qualitySummary.overall.totalIssues;
    qualitySummary.overall.overallQualityScore = totalRecords > 0 
      ? Math.max(0, 100 - (totalIssues / totalRecords * 100))
      : 100;
    
    res.json({
      success: true,
      data: qualitySummary,
      message: "Data quality summary generated successfully"
    });
  } catch (error) {
    console.error("API: Error generating data quality summary:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

// Delete all data
router.post("/delete-all", async (req, res) => {
  try {
    console.log("API: Starting delete all data operation");
    
    const { storage } = await import("../storage");
    
    // Get current counts before deletion
    const servers = await storage.getAllServers();
    const metrics = await storage.getAllMetrics(); 
    const alerts = await storage.getAllAlerts();
    const remediationActions = await storage.getRemediationActions();
    const auditLogs = await storage.getAuditLogs();
    
    const totalBeforeDelete = servers.length + metrics.length + alerts.length + remediationActions.length + auditLogs.length;
    
    // Clear all data using direct SQL to avoid foreign key constraint issues
    const { db } = await import("../db");
    const schema = await import("@shared/schema");
    
    // Delete in correct order to respect foreign key constraints
    await db.delete(schema.remediationActions);  // Delete first (references alerts)
    await db.delete(schema.alerts);              // Delete second (references servers)
    await db.delete(schema.auditLogs);           // Delete third (references servers)
    await db.delete(schema.serverMetrics);       // Delete fourth (references servers)
    await db.delete(schema.anomalies);           // Delete fifth (references servers)
    await db.delete(schema.predictions);         // Delete sixth (references servers)
    await db.delete(schema.servers);             // Delete last (parent table)
    
    console.log(`API: Successfully deleted ${totalBeforeDelete} records`);
    
    res.json({
      success: true,
      data: {
        totalDeleted: totalBeforeDelete,
        breakdown: {
          servers: servers.length,
          metrics: metrics.length,
          alerts: alerts.length,
          remediationActions: remediationActions.length,
          auditLogs: auditLogs.length
        }
      },
      message: `All data deleted successfully. ${totalBeforeDelete} records removed.`
    });
  } catch (error) {
    console.error("API: Error deleting all data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;