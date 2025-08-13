# AgentOps Data Integration Guide

## Overview
AgentOps can collect data from multiple sources to monitor your infrastructure. Here are the main ways to connect and upload data:

## 1. Server Telemetry Collection

### Automatic Collection
The Telemetry Collector agent automatically gathers metrics from registered servers every 30 seconds:
- CPU usage
- Memory usage and total capacity
- Disk usage and total capacity
- Network latency and throughput
- Process count

### Adding New Servers
Add servers to monitoring via the API or database:

```javascript
// POST /api/servers
{
  "hostname": "web-prod-03",
  "ipAddress": "10.0.1.102",
  "environment": "production",
  "location": "us-west-2a",
  "tags": ["web", "frontend", "nginx"]
}
```

### Integration Methods

#### 1. Agent-Based Collection
Install monitoring agents on your servers that push metrics to AgentOps:
- Use the `/api/metrics` endpoint to send telemetry data
- Authenticate using API keys (set up via secrets)
- Send data in JSON format every 30-60 seconds

#### 2. API Integration
Connect existing monitoring tools:
- Prometheus/Grafana integration
- New Relic data forwarding
- Datadog webhook integration
- Custom monitoring solutions

#### 3. File Upload
For historical data or batch imports:
- CSV format for server inventories
- JSON format for metric histories
- Direct database import for large datasets

## 2. Data Sources Configuration

### Environment Variables
Set up authentication for external data sources:
- `PROMETHEUS_URL` - Prometheus metrics endpoint
- `GRAFANA_API_KEY` - Grafana API access
- `NEWRELIC_API_KEY` - New Relic integration
- `DATADOG_API_KEY` - Datadog webhook auth

### Database Direct Access
For enterprise deployments, connect directly to existing databases:
- MySQL/PostgreSQL monitoring databases
- InfluxDB time-series data
- Elasticsearch logs and metrics

## 3. Real-Time Data Streaming

### WebSocket Connections
Stream live metrics via WebSocket:
- Connect to `/ws` endpoint
- Send real-time telemetry updates
- Receive immediate alert notifications

### Message Queue Integration
For high-volume environments:
- RabbitMQ message processing
- Apache Kafka stream processing
- Redis pub/sub for real-time updates

## 4. Alert Data Sources

### Log File Integration
Monitor log files for errors and warnings:
- Tail log files on servers
- Parse application logs
- Extract error patterns and metrics

### External Monitoring Tools
Import alerts from existing systems:
- PagerDuty incident data
- Splunk alert forwarding
- CloudWatch alarm integration

## 5. Compliance and Audit Data

### Automated Collection
The system automatically logs:
- All agent actions and decisions
- User interactions and approvals
- System state changes
- Performance metrics

### External Audit Systems
Integrate with compliance tools:
- SIEM system integration
- Compliance reporting tools
- Audit trail forwarding

## Getting Started

1. **Set up API keys** for external data sources
2. **Register your servers** in the system
3. **Configure data collection agents** on your infrastructure
4. **Test connectivity** with sample data uploads
5. **Monitor data flow** via the dashboard

## Example Integrations

### Prometheus Integration
```bash
# Configure Prometheus to send alerts to AgentOps
curl -X POST http://your-agentops-url/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "source": "prometheus",
    "severity": "critical",
    "title": "High CPU Usage",
    "server": "web-prod-01",
    "metric": "cpu_usage",
    "value": 95.2,
    "threshold": 85.0
  }'
```

### Custom Metrics Upload
```bash
# Send custom telemetry data
curl -X POST http://your-agentops-url/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-uuid",
    "cpuUsage": 45.2,
    "memoryUsage": 68.5,
    "memoryTotal": 16384,
    "diskUsage": 45.0,
    "diskTotal": 500,
    "networkLatency": 2.3,
    "networkThroughput": 125.5,
    "processCount": 127
  }'
```

For more detailed integration instructions, contact your system administrator or refer to the API documentation.