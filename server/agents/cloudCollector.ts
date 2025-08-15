import { AWSService, type AWSConfig } from '../services/awsService';
import { AzureService, type AzureConfig } from '../services/azureService';
import type { CloudResource, CloudMetric, CloudConnection } from '../../shared/schema';
import type { DatabaseStorage } from '../storage';

export class CloudCollectorAgent {
  public readonly id = "cloud-collector-001";
  public readonly name = "Cloud Collector";
  public readonly type = "cloud_collector";
  
  private storage: DatabaseStorage;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastRun?: Date;
  private collectInterval = 5 * 60 * 1000; // 5 minutes

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Cloud Collector: Already running');
      return;
    }

    console.log('Starting Cloud Collector...');
    this.isRunning = true;

    // Run immediately
    await this.collectCloudData();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.collectCloudData().catch(error => {
        console.error('Cloud Collector: Error during scheduled collection:', error);
      });
    }, this.collectInterval);

    console.log('Started agent: Cloud Collector');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping Cloud Collector...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async collectCloudData(): Promise<void> {
    try {
      console.log('Cloud Collector: Starting cloud resource discovery and metrics collection...');
      
      // Get all active cloud connections
      const connections = await this.storage.getCloudConnections();
      const activeConnections = connections.filter(conn => conn.isActive);

      if (activeConnections.length === 0) {
        console.log('Cloud Collector: No active cloud connections found');
        return;
      }

      for (const connection of activeConnections) {
        try {
          await this.processCloudConnection(connection);
        } catch (error: any) {
          console.error(`Cloud Collector: Error processing ${connection.provider} connection ${connection.id}:`, error.message);
          
          // Update connection status
          await this.storage.updateCloudConnection(connection.id, {
            lastTestResult: {
              status: 'error',
              message: error.message,
              timestamp: new Date(),
            },
          });
        }
      }

      this.lastRun = new Date();
      console.log('Cloud Collector: Completed cloud data collection');
    } catch (error) {
      console.error('Cloud Collector: Error during collection:', error);
    }
  }

  private async processCloudConnection(connection: CloudConnection): Promise<void> {
    console.log(`Cloud Collector: Processing ${connection.provider} connection: ${connection.name}`);

    if (connection.provider === 'aws') {
      await this.processAWSConnection(connection);
    } else if (connection.provider === 'azure') {
      await this.processAzureConnection(connection);
    } else {
      console.warn(`Cloud Collector: Unsupported provider: ${connection.provider}`);
    }
  }

  private async processAWSConnection(connection: CloudConnection): Promise<void> {
    try {
      // Decrypt credentials (in a real implementation, you'd have proper encryption)
      const credentials = JSON.parse(connection.encryptedCredentials) as AWSConfig;
      
      const awsService = new AWSService({
        ...credentials,
        region: connection.region,
      });

      // Test connection
      const testResult = await awsService.testConnection();
      await this.storage.updateCloudConnection(connection.id, {
        lastTestResult: {
          status: testResult.success ? 'success' : 'error',
          message: testResult.message,
          timestamp: new Date(),
        },
      });

      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      // Discover EC2 instances
      const instances = await awsService.discoverEC2Instances();
      console.log(`Cloud Collector: Discovered ${instances.length} EC2 instances`);

      for (const instance of instances) {
        if (!instance.resourceId) continue;

        // Check if resource already exists
        const existingResource = await this.storage.getCloudResourceByResourceId(instance.resourceId);
        
        if (existingResource) {
          // Update existing resource
          await this.storage.updateCloudResource(existingResource.id, {
            status: instance.status,
            configuration: instance.configuration,
            tags: instance.tags,
            lastSync: new Date(),
          });
        } else {
          // Create new resource
          await this.storage.createCloudResource({
            resourceId: instance.resourceId!,
            resourceName: instance.resourceName!,
            resourceType: instance.resourceType!,
            provider: instance.provider!,
            region: instance.region!,
            environment: instance.environment!,
            status: instance.status!,
            configuration: instance.configuration || {},
            tags: instance.tags || {},
            cost: await awsService.estimateInstanceCost(instance.configuration?.instanceType || ''),
          });
        }

        // Collect metrics for the instance
        await this.collectInstanceMetrics(awsService, instance.resourceId);
      }
    } catch (error: any) {
      console.error(`Cloud Collector: AWS processing failed:`, error.message);
      throw error;
    }
  }

  private async processAzureConnection(connection: CloudConnection): Promise<void> {
    try {
      // Decrypt credentials (in a real implementation, you'd have proper encryption)
      const credentials = JSON.parse(connection.encryptedCredentials) as AzureConfig;
      
      const azureService = new AzureService(credentials);

      // Test connection
      const testResult = await azureService.testConnection();
      await this.storage.updateCloudConnection(connection.id, {
        lastTestResult: {
          status: testResult.success ? 'success' : 'error',
          message: testResult.message,
          timestamp: new Date(),
        },
      });

      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      // Discover VMs
      const vms = await azureService.discoverVirtualMachines();
      console.log(`Cloud Collector: Discovered ${vms.length} Azure VMs`);

      for (const vm of vms) {
        if (!vm.resourceId) continue;

        // Check if resource already exists
        const existingResource = await this.storage.getCloudResourceByResourceId(vm.resourceId);
        
        if (existingResource) {
          // Update existing resource
          await this.storage.updateCloudResource(existingResource.id, {
            status: vm.status,
            configuration: vm.configuration,
            tags: vm.tags,
            lastSync: new Date(),
          });
        } else {
          // Create new resource
          await this.storage.createCloudResource({
            resourceId: vm.resourceId!,
            resourceName: vm.resourceName!,
            resourceType: vm.resourceType!,
            provider: vm.provider!,
            region: vm.region!,
            environment: vm.environment!,
            status: vm.status!,
            configuration: vm.configuration || {},
            tags: vm.tags || {},
            cost: await azureService.estimateVMCost(vm.configuration?.vmSize || '', vm.region!),
          });
        }

        // Collect metrics for the VM
        await this.collectVMMetrics(azureService, vm.resourceId);
      }
    } catch (error: any) {
      console.error(`Cloud Collector: Azure processing failed:`, error.message);
      throw error;
    }
  }

  private async collectInstanceMetrics(awsService: AWSService, instanceId: string): Promise<void> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const metrics = await awsService.getInstanceMetrics(instanceId, startTime, endTime);
      
      // Get the cloud resource record
      const resource = await this.storage.getCloudResourceByResourceId(instanceId);
      if (!resource) {
        console.warn(`Cloud Collector: Resource not found for instance ${instanceId}`);
        return;
      }

      // Store metrics
      for (const metric of metrics) {
        if (metric.metricName && metric.metricValue && metric.timestamp) {
          await this.storage.createCloudMetric({
            resourceId: resource.id,
            metricName: metric.metricName,
            metricValue: metric.metricValue,
            unit: metric.unit || 'Unknown',
            dimensions: metric.dimensions || {},
            timestamp: metric.timestamp,
          });
        }
      }

      console.log(`Cloud Collector: Collected ${metrics.length} metrics for instance ${instanceId}`);
    } catch (error: any) {
      console.error(`Cloud Collector: Failed to collect metrics for instance ${instanceId}:`, error.message);
    }
  }

  private async collectVMMetrics(azureService: AzureService, vmResourceId: string): Promise<void> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

      const metrics = await azureService.getVMMetrics(vmResourceId, startTime, endTime);
      
      // Get the cloud resource record
      const resource = await this.storage.getCloudResourceByResourceId(vmResourceId);
      if (!resource) {
        console.warn(`Cloud Collector: Resource not found for VM ${vmResourceId}`);
        return;
      }

      // Store metrics
      for (const metric of metrics) {
        if (metric.metricName && metric.metricValue && metric.timestamp) {
          await this.storage.createCloudMetric({
            resourceId: resource.id,
            metricName: metric.metricName,
            metricValue: metric.metricValue,
            unit: metric.unit || 'Unknown',
            dimensions: metric.dimensions || {},
            timestamp: metric.timestamp,
          });
        }
      }

      console.log(`Cloud Collector: Collected ${metrics.length} metrics for VM ${vmResourceId}`);
    } catch (error: any) {
      console.error(`Cloud Collector: Failed to collect metrics for VM ${vmResourceId}:`, error.message);
    }
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      collectInterval: this.collectInterval,
    };
  }
}