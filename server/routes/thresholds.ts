import { Router } from "express";
import { thresholdConfig, DEFAULT_THRESHOLDS } from "../config/thresholds";

export const thresholdsRouter = Router();

// Get all threshold configurations
thresholdsRouter.get("/", async (req, res) => {
  try {
    const allThresholds = thresholdConfig.getAllThresholds();
    res.json(allThresholds);
  } catch (error) {
    console.error("Error fetching thresholds:", error);
    res.status(500).json({ error: "Failed to fetch thresholds" });
  }
});

// Get thresholds for a specific environment
thresholdsRouter.get("/:environment", async (req, res) => {
  try {
    const { environment } = req.params;
    const thresholds = thresholdConfig.getThresholds(environment);
    res.json(thresholds);
  } catch (error) {
    console.error("Error fetching environment thresholds:", error);
    res.status(500).json({ error: "Failed to fetch environment thresholds" });
  }
});

// Update thresholds for a specific environment
thresholdsRouter.put("/:environment", async (req, res) => {
  try {
    const { environment } = req.params;
    const thresholdUpdates = req.body;

    // Validate the request body
    if (!thresholdUpdates || typeof thresholdUpdates !== 'object') {
      return res.status(400).json({ error: "Invalid threshold data" });
    }

    // Update the thresholds
    thresholdConfig.updateThresholds(environment, thresholdUpdates);

    // Return the updated thresholds
    const updatedThresholds = thresholdConfig.getThresholds(environment);
    
    res.json({
      message: `Thresholds updated for ${environment}`,
      thresholds: updatedThresholds
    });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    res.status(500).json({ error: "Failed to update thresholds" });
  }
});

// Reset thresholds to default for a specific environment
thresholdsRouter.post("/:environment/reset", async (req, res) => {
  try {
    const { environment } = req.params;
    
    // Get default thresholds for this environment
    const defaultThresholds = DEFAULT_THRESHOLDS[environment as keyof typeof DEFAULT_THRESHOLDS] 
      || DEFAULT_THRESHOLDS.default;
    
    // Reset to defaults
    thresholdConfig.updateThresholds(environment, defaultThresholds);
    
    res.json({
      message: `Thresholds reset to default for ${environment}`,
      thresholds: defaultThresholds
    });
  } catch (error) {
    console.error("Error resetting thresholds:", error);
    res.status(500).json({ error: "Failed to reset thresholds" });
  }
});

// Get current threshold status for all servers
thresholdsRouter.get("/status/all", async (req, res) => {
  try {
    const { storage } = await import("../storage");
    
    const servers = await storage.getAllServers();
    const latestMetrics = await storage.getLatestMetrics();
    
    const serverStatuses = servers.map(server => {
      const metrics = latestMetrics.find(m => m.serverId === server.id);
      if (!metrics) {
        return {
          serverId: server.id,
          hostname: server.hostname,
          environment: server.environment || 'default',
          status: 'no_data'
        };
      }

      const environment = server.environment || 'default';
      const thresholds = thresholdConfig.getThresholds(environment);
      
      const cpuUsage = parseFloat(metrics.cpuUsage);
      const memoryUsage = parseFloat(metrics.memoryUsage);
      const diskUsage = parseFloat(metrics.diskUsage);
      
      const cpuCheck = thresholdConfig.checkThreshold('cpu', cpuUsage, environment);
      const memoryCheck = thresholdConfig.checkThreshold('memory', memoryUsage, environment);
      const diskCheck = thresholdConfig.checkThreshold('disk', diskUsage, environment);
      
      // Determine overall status
      const severities = [cpuCheck.severity, memoryCheck.severity, diskCheck.severity];
      let overallStatus = 'normal';
      if (severities.includes('critical')) overallStatus = 'critical';
      else if (severities.includes('warning')) overallStatus = 'warning';
      
      return {
        serverId: server.id,
        hostname: server.hostname,
        environment,
        status: overallStatus,
        metrics: {
          cpu: { value: cpuUsage, status: cpuCheck.severity, threshold: cpuCheck.threshold },
          memory: { value: memoryUsage, status: memoryCheck.severity, threshold: memoryCheck.threshold },
          disk: { value: diskUsage, status: diskCheck.severity, threshold: diskCheck.threshold }
        },
        thresholds
      };
    });
    
    res.json(serverStatuses);
  } catch (error) {
    console.error("Error fetching threshold status:", error);
    res.status(500).json({ error: "Failed to fetch threshold status" });
  }
});

export default thresholdsRouter;