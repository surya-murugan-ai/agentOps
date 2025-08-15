import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { MonitorClient } from '@azure/arm-monitor';
import { ComputeManagementClient } from '@azure/arm-compute';
import type { CloudResource, CloudMetric } from '../../shared/schema';

export interface AzureCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface AzureConfig extends AzureCredentials {
  subscriptionId: string;
}

export class AzureService {
  private computeClient: ComputeManagementClient;
  private monitorClient: MonitorClient;
  private config: AzureConfig;
  private credential: ClientSecretCredential;

  constructor(config: AzureConfig) {
    this.config = config;
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );
    
    this.computeClient = new ComputeManagementClient(
      this.credential,
      config.subscriptionId
    );
    
    this.monitorClient = new MonitorClient(
      this.credential,
      config.subscriptionId
    );
  }

  // Test connection to Azure
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to list VMs to test connection
      const vms = this.computeClient.virtualMachines.listAll();
      const iterator = vms[Symbol.asyncIterator]();
      await iterator.next(); // Just try to get the first result
      return { success: true, message: 'Successfully connected to Azure' };
    } catch (error: any) {
      return { success: false, message: `Azure connection failed: ${error.message}` };
    }
  }

  // Discover Azure Virtual Machines
  async discoverVirtualMachines(): Promise<Partial<CloudResource>[]> {
    try {
      const instances: Partial<CloudResource>[] = [];
      
      for await (const vm of this.computeClient.virtualMachines.listAll()) {
        if (!vm.id || !vm.name) continue;
        
        const resourceGroup = this.extractResourceGroupFromId(vm.id);
        const location = vm.location || 'unknown';
        
        // Get VM status
        const vmStatus = await this.getVMStatus(resourceGroup, vm.name);
        
        instances.push({
          resourceId: vm.id,
          resourceName: vm.name,
          resourceType: 'vm' as const,
          provider: 'azure' as const,
          region: location,
          environment: vm.tags?.Environment || vm.tags?.Env || 'unknown',
          status: this.mapVMPowerState(vmStatus),
          configuration: {
            vmSize: vm.hardwareProfile?.vmSize,
            osType: vm.storageProfile?.osDisk?.osType,
            imageReference: vm.storageProfile?.imageReference,
            networkInterfaces: vm.networkProfile?.networkInterfaces?.map(ni => ni.id),
            diagnostics: vm.diagnosticsProfile?.bootDiagnostics?.enabled,
            resourceGroup: resourceGroup,
          },
          tags: vm.tags || {},
        });
      }
      
      return instances;
    } catch (error: any) {
      console.error('Error discovering Azure VMs:', error);
      throw new Error(`Failed to discover Azure VMs: ${error.message}`);
    }
  }

  // Get Azure Monitor metrics for a VM
  async getVMMetrics(resourceId: string, startTime: Date, endTime: Date): Promise<Partial<CloudMetric>[]> {
    try {
      const metrics: Partial<CloudMetric>[] = [];
      
      // Define the metrics we want to collect
      const metricNames = [
        'Percentage CPU',
        'Network In Total',
        'Network Out Total',
        'Disk Read Bytes',
        'Disk Write Bytes',
        'Available Memory Bytes',
      ];

      for (const metricName of metricNames) {
        try {
          const metricData = await this.monitorClient.metrics.list(
            resourceId,
            {
              timespan: `${startTime.toISOString()}/${endTime.toISOString()}`,
              interval: 'PT5M', // 5 minutes
              metricnames: metricName,
              aggregation: 'Average',
            }
          );

          if (metricData.value) {
            for (const metric of metricData.value) {
              if (metric.timeseries) {
                for (const timeseries of metric.timeseries) {
                  if (timeseries.data) {
                    for (const datapoint of timeseries.data) {
                      if (datapoint.average !== undefined && datapoint.timeStamp) {
                        metrics.push({
                          metricName: metricName,
                          metricValue: datapoint.average.toString(),
                          unit: metric.unit || 'Unknown',
                          timestamp: datapoint.timeStamp,
                          dimensions: {
                            resourceId: resourceId,
                          },
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (metricError: any) {
          console.warn(`Failed to get metric ${metricName} for ${resourceId}:`, metricError.message);
          // Continue with other metrics
        }
      }

      return metrics;
    } catch (error: any) {
      console.error(`Error getting metrics for VM ${resourceId}:`, error);
      throw new Error(`Failed to get VM metrics: ${error.message}`);
    }
  }

  // Get VM power state
  private async getVMStatus(resourceGroup: string, vmName: string): Promise<string> {
    try {
      const instanceView = await this.computeClient.virtualMachines.instanceView(
        resourceGroup,
        vmName
      );
      
      const powerState = instanceView.statuses?.find(status => 
        status.code?.startsWith('PowerState/')
      );
      
      return powerState?.displayStatus || 'Unknown';
    } catch (error) {
      console.warn(`Failed to get VM status for ${vmName}:`, error);
      return 'Unknown';
    }
  }

  // Helper method to extract resource group from Azure resource ID
  private extractResourceGroupFromId(resourceId: string): string {
    const parts = resourceId.split('/');
    const resourceGroupIndex = parts.indexOf('resourceGroups');
    if (resourceGroupIndex !== -1 && resourceGroupIndex + 1 < parts.length) {
      return parts[resourceGroupIndex + 1];
    }
    return 'unknown';
  }

  // Helper method to map Azure VM power states to our status
  private mapVMPowerState(powerState: string): string {
    switch (powerState) {
      case 'VM running':
        return 'running';
      case 'VM stopped':
      case 'VM deallocated':
        return 'stopped';
      case 'VM starting':
        return 'starting';
      case 'VM stopping':
        return 'stopping';
      default:
        return 'unknown';
    }
  }

  // Estimate monthly costs for a VM
  async estimateVMCost(vmSize: string, region: string): Promise<number> {
    // This is a simplified cost estimation
    // In a real implementation, you'd use Azure Pricing API
    const vmPricing: Record<string, number> = {
      'Standard_B1s': 7.59,
      'Standard_B1ms': 15.18,
      'Standard_B2s': 30.37,
      'Standard_D2s_v3': 70.08,
      'Standard_D4s_v3': 140.16,
      'Standard_F2s_v2': 62.05,
      'Standard_F4s_v2': 124.10,
    };

    return vmPricing[vmSize] || 0;
  }
}