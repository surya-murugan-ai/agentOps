import { Agent } from "./index";
import { storage } from "../storage";
import { wsManager } from "../services/websocket";

export class TelemetryCollectorAgent implements Agent {
  public readonly id = "telemetry-collector-001";
  public readonly name = "Telemetry Collector";
  public readonly type = "collector";
  
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private processedCount = 0;
  private errorCount = 0;

  async start(): Promise<void> {
    if (this.running) return;
    
    console.log(`Starting ${this.name}...`);
    this.running = true;
    
    // Start collecting telemetry data every 30 seconds
    this.intervalId = setInterval(() => {
      this.collectTelemetry();
    }, 30000);

    // Initial collection
    await this.collectTelemetry();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    
    console.log(`Stopping ${this.name}...`);
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.running ? "active" : "inactive",
      cpuUsage: this.getRandomBetween(8, 15),
      memoryUsage: this.getRandomBetween(400, 600),
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      uptime: this.running ? "Active" : "Inactive"
    };
  }

  private async collectTelemetry() {
    if (!this.running) return;

    try {
      // Get all servers
      const servers = await storage.getAllServers();
      
      for (const server of servers) {
        // Generate realistic telemetry data
        const metrics = {
          serverId: server.id,
          cpuUsage: this.generateCpuUsage().toString(),
          memoryUsage: this.generateMemoryUsage().toString(),
          memoryTotal: 16384, // 16GB
          diskUsage: this.generateDiskUsage().toString(),
          diskTotal: 500, // 500GB
          networkLatency: this.generateNetworkLatency(),
          networkThroughput: this.generateNetworkThroughput(),
          processCount: this.generateProcessCount(),
        };

        await storage.addServerMetrics(metrics);
        this.processedCount++;

        // Update server status based on metrics
        const status = this.determineServerStatus(metrics);
        if (server.status !== status) {
          await storage.updateServerStatus(server.id, status);
        }
      }

      // Broadcast metrics update
      const latestMetrics = await storage.getLatestMetrics();
      wsManager.broadcastMetricsUpdate(latestMetrics);

      console.log(`${this.name}: Collected telemetry for ${servers.length} servers`);
    } catch (error) {
      console.error(`${this.name}: Error collecting telemetry:`, error);
      this.errorCount++;
    }
  }

  private generateCpuUsage(): number {
    // Generate realistic CPU usage with some variance
    const baseUsage = 45 + Math.random() * 30; // 45-75% base
    const spike = Math.random() < 0.1 ? Math.random() * 25 : 0; // 10% chance of spike
    return Math.min(100, baseUsage + spike);
  }

  private generateMemoryUsage(): number {
    // Generate realistic memory usage
    const baseUsage = 60 + Math.random() * 25; // 60-85% base
    const spike = Math.random() < 0.05 ? Math.random() * 15 : 0; // 5% chance of spike
    return Math.min(100, baseUsage + spike);
  }

  private generateDiskUsage(): number {
    // Disk usage changes slowly
    return 40 + Math.random() * 20; // 40-60%
  }

  private generateNetworkLatency(): string {
    // Network latency in ms
    const base = 8 + Math.random() * 15; // 8-23ms base
    const spike = Math.random() < 0.05 ? Math.random() * 50 : 0; // 5% chance of spike
    return (base + spike).toFixed(3);
  }

  private generateNetworkThroughput(): string {
    // Network throughput in MB/s
    return (Math.random() * 100 + 50).toFixed(2);
  }

  private generateProcessCount(): number {
    return Math.floor(Math.random() * 50 + 100); // 100-150 processes
  }

  private determineServerStatus(metrics: any): string {
    const cpu = parseFloat(metrics.cpuUsage);
    const memory = parseFloat(metrics.memoryUsage);
    const disk = parseFloat(metrics.diskUsage);

    if (cpu > 90 || memory > 90 || disk > 85) {
      return "critical";
    } else if (cpu > 75 || memory > 80 || disk > 70) {
      return "warning";
    } else {
      return "healthy";
    }
  }

  private getRandomBetween(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(1);
  }
}
