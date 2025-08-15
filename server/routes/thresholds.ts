import express from "express";
import { thresholdConfig } from "../config/thresholds";

const router = express.Router();

/**
 * Get current threshold configurations
 */
router.get("/", (req, res) => {
  try {
    const allThresholds = thresholdConfig.getAllThresholds();
    res.json({
      success: true,
      thresholds: allThresholds,
      message: "Current threshold configurations retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting thresholds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve threshold configurations"
    });
  }
});

/**
 * Get thresholds for a specific environment
 */
router.get("/:environment", (req, res) => {
  try {
    const { environment } = req.params;
    const thresholds = thresholdConfig.getThresholds(environment);
    
    res.json({
      success: true,
      environment,
      thresholds,
      message: `Thresholds for ${environment} environment retrieved successfully`
    });
  } catch (error) {
    console.error("Error getting environment thresholds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve environment thresholds"
    });
  }
});

/**
 * Update thresholds for a specific environment
 */
router.put("/:environment", (req, res) => {
  try {
    const { environment } = req.params;
    const { thresholds } = req.body;

    if (!thresholds) {
      return res.status(400).json({
        success: false,
        error: "Thresholds data is required"
      });
    }

    // Validate threshold structure
    const validMetrics = ['cpu', 'memory', 'disk', 'network'];
    const validThresholdKeys = ['warning', 'critical', 'latencyWarning', 'latencyCritical', 'throughputWarning'];
    
    for (const metric in thresholds) {
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({
          success: false,
          error: `Invalid metric type: ${metric}`
        });
      }
      
      for (const key in thresholds[metric]) {
        if (!validThresholdKeys.includes(key)) {
          return res.status(400).json({
            success: false,
            error: `Invalid threshold key: ${key} for metric: ${metric}`
          });
        }
        
        const value = thresholds[metric][key];
        if (typeof value !== 'number' || value < 0 || value > 100) {
          return res.status(400).json({
            success: false,
            error: `Invalid threshold value: ${value}. Must be a number between 0-100`
          });
        }
      }
    }

    // Update thresholds
    thresholdConfig.updateThresholds(environment, thresholds);
    
    const updatedThresholds = thresholdConfig.getThresholds(environment);
    
    res.json({
      success: true,
      environment,
      thresholds: updatedThresholds,
      message: `Thresholds for ${environment} environment updated successfully`
    });
  } catch (error) {
    console.error("Error updating thresholds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update threshold configurations"
    });
  }
});

/**
 * Reset thresholds for an environment to defaults
 */
router.post("/:environment/reset", (req, res) => {
  try {
    const { environment } = req.params;
    
    // Clear cached thresholds to force reload from defaults
    const service = thresholdConfig as any;
    service.currentThresholds.delete(environment);
    
    const resetThresholds = thresholdConfig.getThresholds(environment);
    
    res.json({
      success: true,
      environment,
      thresholds: resetThresholds,
      message: `Thresholds for ${environment} environment reset to defaults`
    });
  } catch (error) {
    console.error("Error resetting thresholds:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset threshold configurations"
    });
  }
});

/**
 * Test threshold against a value
 */
router.post("/test", (req, res) => {
  try {
    const { metricType, value, environment = 'default' } = req.body;
    
    if (!metricType || typeof value !== 'number') {
      return res.status(400).json({
        success: false,
        error: "metricType and value are required"
      });
    }
    
    if (!['cpu', 'memory', 'disk'].includes(metricType)) {
      return res.status(400).json({
        success: false,
        error: "metricType must be cpu, memory, or disk"
      });
    }
    
    const result = thresholdConfig.checkThreshold(metricType, value, environment);
    
    res.json({
      success: true,
      metricType,
      value,
      environment,
      result,
      message: `Threshold check completed: ${result.severity} level`
    });
  } catch (error) {
    console.error("Error testing threshold:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test threshold"
    });
  }
});

export { router as thresholdsRouter };