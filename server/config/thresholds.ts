/**
 * Centralized Alert Threshold Configuration
 * This file defines the monitoring thresholds for all system metrics
 */

export interface AlertThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  disk: {
    warning: number;
    critical: number;
  };
  network: {
    latencyWarning: number; // ms
    latencyCritical: number; // ms
    throughputWarning: number; // Mbps minimum
  };
}

export interface EnvironmentThresholds {
  production: AlertThresholds;
  staging: AlertThresholds;
  development: AlertThresholds;
  default: AlertThresholds;
}

/**
 * Default threshold configurations by environment
 * Production environments typically have stricter thresholds
 */
export const DEFAULT_THRESHOLDS: EnvironmentThresholds = {
  production: {
    cpu: { warning: 80, critical: 90 },
    memory: { warning: 85, critical: 95 },
    disk: { warning: 75, critical: 85 },
    network: { latencyWarning: 100, latencyCritical: 500, throughputWarning: 10 }
  },
  staging: {
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 85, critical: 95 },
    disk: { warning: 80, critical: 90 },
    network: { latencyWarning: 150, latencyCritical: 750, throughputWarning: 5 }
  },
  development: {
    cpu: { warning: 90, critical: 98 },
    memory: { warning: 90, critical: 98 },
    disk: { warning: 85, critical: 95 },
    network: { latencyWarning: 200, latencyCritical: 1000, throughputWarning: 1 }
  },
  default: {
    cpu: { warning: 85, critical: 95 },
    memory: { warning: 85, critical: 95 },
    disk: { warning: 80, critical: 90 },
    network: { latencyWarning: 100, latencyCritical: 500, throughputWarning: 10 }
  }
};

/**
 * Service class for managing alert thresholds
 */
export class ThresholdConfigService {
  private static instance: ThresholdConfigService;
  private currentThresholds: Map<string, AlertThresholds> = new Map();

  static getInstance(): ThresholdConfigService {
    if (!ThresholdConfigService.instance) {
      ThresholdConfigService.instance = new ThresholdConfigService();
    }
    return ThresholdConfigService.instance;
  }

  /**
   * Get thresholds for a specific server or environment
   */
  getThresholds(serverEnvironment: string = 'default'): AlertThresholds {
    // Check if we have server-specific thresholds cached
    const cached = this.currentThresholds.get(serverEnvironment);
    if (cached) {
      return cached;
    }

    // Fall back to environment defaults
    const envThresholds = DEFAULT_THRESHOLDS[serverEnvironment as keyof EnvironmentThresholds] || DEFAULT_THRESHOLDS.default;
    
    // Cache the result
    this.currentThresholds.set(serverEnvironment, envThresholds);
    
    return envThresholds;
  }

  /**
   * Update thresholds for a specific environment
   */
  updateThresholds(environment: string, thresholds: Partial<AlertThresholds>): void {
    const current = this.getThresholds(environment);
    const updated: AlertThresholds = {
      cpu: { ...current.cpu, ...thresholds.cpu },
      memory: { ...current.memory, ...thresholds.memory },
      disk: { ...current.disk, ...thresholds.disk },
      network: { ...current.network, ...thresholds.network }
    };

    this.currentThresholds.set(environment, updated);
    console.log(`Updated thresholds for ${environment}:`, updated);
  }

  /**
   * Check if a metric value exceeds thresholds
   */
  checkThreshold(
    metricType: 'cpu' | 'memory' | 'disk', 
    value: number, 
    environment: string = 'default'
  ): { severity: 'normal' | 'warning' | 'critical', threshold: number } {
    const thresholds = this.getThresholds(environment);
    const metricThresholds = thresholds[metricType];

    if (value >= metricThresholds.critical) {
      return { severity: 'critical', threshold: metricThresholds.critical };
    } else if (value >= metricThresholds.warning) {
      return { severity: 'warning', threshold: metricThresholds.warning };
    } else {
      return { severity: 'normal', threshold: 0 };
    }
  }

  /**
   * Get all current threshold configurations
   */
  getAllThresholds(): Record<string, AlertThresholds> {
    const result: Record<string, AlertThresholds> = {};
    
    // Include default environment thresholds
    Object.keys(DEFAULT_THRESHOLDS).forEach(env => {
      result[env] = this.getThresholds(env);
    });

    // Include any custom cached thresholds
    this.currentThresholds.forEach((thresholds, environment) => {
      result[environment] = thresholds;
    });

    return result;
  }
}

export const thresholdConfig = ThresholdConfigService.getInstance();