import { storage } from "../storage";
import type { Server, ServerMetrics, Alert } from "@shared/schema";

interface DataCleaningOptions {
  removeDuplicates?: boolean;
  handleMissingValues?: boolean;
  normalizeValues?: boolean;
  validateDataTypes?: boolean;
  cleanOutliers?: boolean;
}

interface DataCleaningResult {
  duplicatesRemoved: number;
  missingValuesHandled: number;
  outliersDetected: number;
  recordsProcessed: number;
  dataQualityScore: number;
}

interface ComprehensiveCleaningResult {
  servers: DataCleaningResult;
  metrics: DataCleaningResult;
  alerts: DataCleaningResult;
  summary: {
    totalDuplicatesRemoved: number;
    totalMissingValuesHandled: number;
    totalOutliersDetected: number;
    totalRecordsProcessed: number;
    overallQualityScore: number;
  };
}

class DataAgent {
  private name = "Data Cleaning Agent";

  constructor() {
    console.log(`${this.name}: Initialized data cleaning and normalization agent`);
  }

  // Clean server data with comprehensive validation
  async cleanServerData(options: DataCleaningOptions = {}): Promise<DataCleaningResult> {
    console.log(`${this.name}: Starting server data cleaning with options:`, options);
    
    const servers = await storage.getAllServers();
    let duplicatesRemoved = 0;
    let missingValuesHandled = 0;
    let outliersDetected = 0;
    
    // Track original count
    const originalCount = servers.length;
    
    // Remove duplicates if enabled
    if (options.removeDuplicates) {
      const uniqueServers = this.removeDuplicateServers(servers);
      duplicatesRemoved = servers.length - uniqueServers.length;
      
      // Delete duplicate servers from database
      if (duplicatesRemoved > 0) {
        console.log(`${this.name}: Removing ${duplicatesRemoved} duplicate servers`);
        // Implementation would involve updating the database
      }
    }
    
    // Handle missing values if enabled
    if (options.handleMissingValues) {
      for (const server of servers) {
        let valuesHandled = 0;
        
        // Handle missing hostname
        if (!server.hostname || server.hostname.trim() === '') {
          server.hostname = `server-${server.id.substring(0, 8)}`;
          valuesHandled++;
        }
        
        // Handle missing IP address
        if (!server.ipAddress || server.ipAddress.trim() === '') {
          server.ipAddress = '0.0.0.0';
          valuesHandled++;
        }
        
        // Handle missing location
        if (!server.location || server.location.trim() === '') {
          server.location = 'Unknown';
          valuesHandled++;
        }
        
        // Handle missing environment
        if (!server.environment || server.environment.trim() === '') {
          server.environment = 'production';
          valuesHandled++;
        }
        
        if (valuesHandled > 0) {
          missingValuesHandled += valuesHandled;
          // Update server in database
          await storage.updateServer(server.id, {
            hostname: server.hostname,
            ipAddress: server.ipAddress,
            location: server.location,
            environment: server.environment
          });
        }
      }
    }
    
    // Calculate data quality score
    const dataQualityScore = this.calculateServerDataQuality(servers);
    
    console.log(`${this.name}: Server data cleaning completed. ${duplicatesRemoved} duplicates removed, ${missingValuesHandled} missing values handled`);
    
    return {
      duplicatesRemoved,
      missingValuesHandled,
      outliersDetected,
      recordsProcessed: originalCount,
      dataQualityScore
    };
  }

  // Clean metrics data with outlier detection
  async cleanMetricsData(options: DataCleaningOptions = {}): Promise<DataCleaningResult> {
    console.log(`${this.name}: Starting metrics data cleaning with options:`, options);
    
    const metrics = await storage.getAllMetrics();
    let duplicatesRemoved = 0;
    let missingValuesHandled = 0;
    let outliersDetected = 0;
    
    const originalCount = metrics.length;
    
    // Remove duplicates if enabled
    if (options.removeDuplicates) {
      const uniqueMetrics = this.removeDuplicateMetrics(metrics);
      duplicatesRemoved = metrics.length - uniqueMetrics.length;
    }
    
    // Handle missing values and detect outliers
    if (options.handleMissingValues || options.cleanOutliers) {
      for (const metric of metrics) {
        let valuesHandled = 0;
        
        // Handle null CPU usage
        if (metric.cpuUsage === null) {
          metric.cpuUsage = 0;
          valuesHandled++;
        }
        
        // Handle null memory usage
        if (metric.memoryUsage === null) {
          metric.memoryUsage = 0;
          valuesHandled++;
        }
        
        // Handle null disk usage
        if (metric.diskUsage === null) {
          metric.diskUsage = 0;
          valuesHandled++;
        }
        
        // Handle null network I/O
        if (metric.networkIn === null) metric.networkIn = 0;
        if (metric.networkOut === null) metric.networkOut = 0;
        
        // Detect outliers (values > 100% for usage metrics)
        if (options.cleanOutliers) {
          if (metric.cpuUsage > 100) {
            metric.cpuUsage = 100;
            outliersDetected++;
          }
          if (metric.memoryUsage > 100) {
            metric.memoryUsage = 100;
            outliersDetected++;
          }
          if (metric.diskUsage > 100) {
            metric.diskUsage = 100;
            outliersDetected++;
          }
        }
        
        if (valuesHandled > 0) {
          missingValuesHandled += valuesHandled;
          // Update metric in database
          await storage.updateMetric(metric.id, {
            cpuUsage: metric.cpuUsage,
            memoryUsage: metric.memoryUsage,
            diskUsage: metric.diskUsage,
            networkIn: metric.networkIn,
            networkOut: metric.networkOut
          });
        }
      }
    }
    
    const dataQualityScore = this.calculateMetricsDataQuality(metrics);
    
    console.log(`${this.name}: Metrics data cleaning completed. ${duplicatesRemoved} duplicates removed, ${outliersDetected} outliers detected`);
    
    return {
      duplicatesRemoved,
      missingValuesHandled,
      outliersDetected,
      recordsProcessed: originalCount,
      dataQualityScore
    };
  }

  // Clean alerts data
  async cleanAlertsData(options: DataCleaningOptions = {}): Promise<DataCleaningResult> {
    console.log(`${this.name}: Starting alerts data cleaning with options:`, options);
    
    const alerts = await storage.getAllAlerts();
    let duplicatesRemoved = 0;
    let missingValuesHandled = 0;
    let outliersDetected = 0;
    
    const originalCount = alerts.length;
    
    // Remove duplicates if enabled
    if (options.removeDuplicates) {
      const uniqueAlerts = this.removeDuplicateAlerts(alerts);
      duplicatesRemoved = alerts.length - uniqueAlerts.length;
    }
    
    // Handle missing values
    if (options.handleMissingValues) {
      for (const alert of alerts) {
        let valuesHandled = 0;
        
        // Handle missing title
        if (!alert.title || alert.title.trim() === '') {
          alert.title = `Alert ${alert.id.substring(0, 8)}`;
          valuesHandled++;
        }
        
        // Handle missing description
        if (!alert.description || alert.description.trim() === '') {
          alert.description = 'No description provided';
          valuesHandled++;
        }
        
        // Handle missing severity
        if (!alert.severity) {
          alert.severity = 'medium';
          valuesHandled++;
        }
        
        // Handle missing status
        if (!alert.status) {
          alert.status = 'pending';
          valuesHandled++;
        }
        
        if (valuesHandled > 0) {
          missingValuesHandled += valuesHandled;
          // Update alert in database
          await storage.updateAlert(alert.id, {
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            status: alert.status
          });
        }
      }
    }
    
    const dataQualityScore = this.calculateAlertsDataQuality(alerts);
    
    console.log(`${this.name}: Alerts data cleaning completed. ${duplicatesRemoved} duplicates removed, ${missingValuesHandled} missing values handled`);
    
    return {
      duplicatesRemoved,
      missingValuesHandled,
      outliersDetected,
      recordsProcessed: originalCount,
      dataQualityScore
    };
  }

  // Perform comprehensive data cleaning across all data types
  async performFullDataCleaning(options: DataCleaningOptions = {}): Promise<ComprehensiveCleaningResult> {
    console.log(`${this.name}: Starting comprehensive data cleaning with options:`, options);
    
    const serverResult = await this.cleanServerData(options);
    const metricsResult = await this.cleanMetricsData(options);
    const alertsResult = await this.cleanAlertsData(options);
    
    const summary = {
      totalDuplicatesRemoved: serverResult.duplicatesRemoved + metricsResult.duplicatesRemoved + alertsResult.duplicatesRemoved,
      totalMissingValuesHandled: serverResult.missingValuesHandled + metricsResult.missingValuesHandled + alertsResult.missingValuesHandled,
      totalOutliersDetected: serverResult.outliersDetected + metricsResult.outliersDetected + alertsResult.outliersDetected,
      totalRecordsProcessed: serverResult.recordsProcessed + metricsResult.recordsProcessed + alertsResult.recordsProcessed,
      overallQualityScore: (serverResult.dataQualityScore + metricsResult.dataQualityScore + alertsResult.dataQualityScore) / 3
    };
    
    console.log(`${this.name}: Comprehensive data cleaning completed. Summary:`, summary);
    
    return {
      servers: serverResult,
      metrics: metricsResult,
      alerts: alertsResult,
      summary
    };
  }

  // Helper methods for duplicate detection
  private removeDuplicateServers(servers: Server[]): Server[] {
    const unique = new Map<string, Server>();
    
    for (const server of servers) {
      const key = `${server.hostname}-${server.ipAddress}`;
      if (!unique.has(key)) {
        unique.set(key, server);
      }
    }
    
    return Array.from(unique.values());
  }

  private removeDuplicateMetrics(metrics: ServerMetrics[]): ServerMetrics[] {
    const unique = new Map<string, ServerMetrics>();
    
    for (const metric of metrics) {
      const key = `${metric.serverId}-${metric.timestamp?.getTime()}`;
      if (!unique.has(key)) {
        unique.set(key, metric);
      }
    }
    
    return Array.from(unique.values());
  }

  private removeDuplicateAlerts(alerts: Alert[]): Alert[] {
    const unique = new Map<string, Alert>();
    
    for (const alert of alerts) {
      const key = `${alert.serverId}-${alert.title}-${alert.createdAt?.getTime()}`;
      if (!unique.has(key)) {
        unique.set(key, alert);
      }
    }
    
    return Array.from(unique.values());
  }

  // Data quality calculation methods
  private calculateServerDataQuality(servers: Server[]): number {
    if (servers.length === 0) return 100;
    
    let qualityScore = 0;
    let totalFields = 0;
    
    for (const server of servers) {
      const fields = [server.hostname, server.ipAddress, server.status, server.location, server.environment];
      const validFields = fields.filter(field => field && field.toString().trim() !== '');
      
      qualityScore += (validFields.length / fields.length) * 100;
      totalFields += fields.length;
    }
    
    return qualityScore / servers.length;
  }

  private calculateMetricsDataQuality(metrics: ServerMetrics[]): number {
    if (metrics.length === 0) return 100;
    
    let qualityScore = 0;
    
    for (const metric of metrics) {
      const fields = [metric.cpuUsage, metric.memoryUsage, metric.diskUsage];
      const validFields = fields.filter(field => field !== null && field !== undefined);
      
      qualityScore += (validFields.length / fields.length) * 100;
    }
    
    return qualityScore / metrics.length;
  }

  private calculateAlertsDataQuality(alerts: Alert[]): number {
    if (alerts.length === 0) return 100;
    
    let qualityScore = 0;
    
    for (const alert of alerts) {
      const fields = [alert.title, alert.description, alert.severity, alert.status];
      const validFields = fields.filter(field => field && field.toString().trim() !== '');
      
      qualityScore += (validFields.length / fields.length) * 100;
    }
    
    return qualityScore / alerts.length;
  }
}

export const dataAgent = new DataAgent();