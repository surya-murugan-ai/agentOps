import { EC2Client, DescribeInstancesCommand, Instance } from '@aws-sdk/client-ec2';
import { CloudWatchClient, GetMetricStatisticsCommand, MetricDataQuery, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import type { CloudResource, CloudMetric, CloudConnection } from '../../shared/schema';

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AWSConfig extends AWSCredentials {
  region: string;
}

export class AWSService {
  private ec2Client: EC2Client;
  private cloudWatchClient: CloudWatchClient;
  private config: AWSConfig;

  constructor(config: AWSConfig) {
    this.config = config;
    this.ec2Client = new EC2Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });
    
    this.cloudWatchClient = new CloudWatchClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });
  }

  // Test connection to AWS
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const command = new DescribeInstancesCommand({ MaxResults: 5 });
      await this.ec2Client.send(command);
      return { success: true, message: 'Successfully connected to AWS' };
    } catch (error: any) {
      return { success: false, message: `AWS connection failed: ${error.message}` };
    }
  }

  // Discover EC2 instances
  async discoverEC2Instances(): Promise<Partial<CloudResource>[]> {
    try {
      const command = new DescribeInstancesCommand({});
      const response = await this.ec2Client.send(command);
      
      const instances: Partial<CloudResource>[] = [];
      
      if (response.Reservations) {
        for (const reservation of response.Reservations) {
          if (reservation.Instances) {
            for (const instance of reservation.Instances) {
              const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
              const environmentTag = instance.Tags?.find(tag => tag.Key === 'Environment') || 
                                   instance.Tags?.find(tag => tag.Key === 'Env');
              
              instances.push({
                resourceId: instance.InstanceId!,
                resourceName: nameTag?.Value || instance.InstanceId!,
                resourceType: 'ec2' as const,
                provider: 'aws' as const,
                region: this.config.region,
                environment: environmentTag?.Value || 'unknown',
                status: this.mapInstanceState(instance.State?.Name || 'unknown'),
                configuration: {
                  instanceType: instance.InstanceType,
                  platform: instance.Platform || 'linux',
                  architecture: instance.Architecture,
                  virtualizationType: instance.VirtualizationType,
                  securityGroups: instance.SecurityGroups?.map(sg => ({
                    id: sg.GroupId,
                    name: sg.GroupName,
                  })),
                  subnet: {
                    id: instance.SubnetId,
                    vpcId: instance.VpcId,
                  },
                  publicIp: instance.PublicIpAddress,
                  privateIp: instance.PrivateIpAddress,
                },
                tags: this.convertAwsTagsToObject(instance.Tags || []),
              });
            }
          }
        }
      }
      
      return instances;
    } catch (error: any) {
      console.error('Error discovering EC2 instances:', error);
      throw new Error(`Failed to discover EC2 instances: ${error.message}`);
    }
  }

  // Get CloudWatch metrics for an EC2 instance
  async getInstanceMetrics(instanceId: string, startTime: Date, endTime: Date): Promise<Partial<CloudMetric>[]> {
    try {
      const metrics: Partial<CloudMetric>[] = [];
      
      // Define the metrics we want to collect
      const metricQueries = [
        { name: 'CPUUtilization', unit: 'Percent' },
        { name: 'NetworkIn', unit: 'Bytes' },
        { name: 'NetworkOut', unit: 'Bytes' },
        { name: 'DiskReadBytes', unit: 'Bytes' },
        { name: 'DiskWriteBytes', unit: 'Bytes' },
      ];

      for (const metric of metricQueries) {
        const command = new GetMetricStatisticsCommand({
          Namespace: 'AWS/EC2',
          MetricName: metric.name,
          Dimensions: [
            {
              Name: 'InstanceId',
              Value: instanceId,
            },
          ],
          StartTime: startTime,
          EndTime: endTime,
          Period: 300, // 5 minutes
          Statistics: ['Average'],
        });

        const response = await this.cloudWatchClient.send(command);
        
        if (response.Datapoints) {
          for (const datapoint of response.Datapoints) {
            if (datapoint.Average !== undefined && datapoint.Timestamp) {
              metrics.push({
                metricName: metric.name,
                metricValue: datapoint.Average.toString(),
                unit: metric.unit,
                timestamp: datapoint.Timestamp,
                dimensions: {
                  InstanceId: instanceId,
                },
              });
            }
          }
        }
      }

      return metrics;
    } catch (error: any) {
      console.error(`Error getting metrics for instance ${instanceId}:`, error);
      throw new Error(`Failed to get instance metrics: ${error.message}`);
    }
  }

  // Helper method to map AWS instance states to our status
  private mapInstanceState(state: string): string {
    switch (state) {
      case 'running':
        return 'running';
      case 'stopped':
        return 'stopped';
      case 'terminated':
        return 'terminated';
      case 'stopping':
      case 'shutting-down':
        return 'stopping';
      case 'pending':
        return 'starting';
      default:
        return 'unknown';
    }
  }

  // Helper method to convert AWS tags to our tag format
  private convertAwsTagsToObject(tags: Array<{ Key?: string; Value?: string }>): Record<string, any> {
    const tagObject: Record<string, any> = {};
    for (const tag of tags) {
      if (tag.Key && tag.Value) {
        tagObject[tag.Key] = tag.Value;
      }
    }
    return tagObject;
  }

  // Estimate monthly costs for an instance
  async estimateInstanceCost(instanceType: string): Promise<number> {
    // This is a simplified cost estimation
    // In a real implementation, you'd use AWS Pricing API or Cost Explorer
    const instancePricing: Record<string, number> = {
      't2.micro': 8.47,
      't2.small': 16.93,
      't2.medium': 33.87,
      't3.micro': 7.59,
      't3.small': 15.18,
      't3.medium': 30.37,
      'm5.large': 69.12,
      'm5.xlarge': 138.24,
      'c5.large': 62.05,
      'c5.xlarge': 124.10,
    };

    return instancePricing[instanceType] || 0;
  }
}