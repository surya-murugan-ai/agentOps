# AgentOps - Local Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the AgentOps AI monitoring platform locally on your development machine or on-premise servers.

## Prerequisites

### System Requirements
- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Python**: v3.9+ (for data processing scripts)
- **Git**: Latest version
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 10GB free space minimum

### Required API Keys
Before starting, obtain these API keys:
- **OpenAI API Key**: For AI agents and analysis
- **Anthropic API Key**: For Claude-based agents (optional but recommended)

## Quick Start

### 1. Clone Repository
```bash
git clone <your-repository-url>
cd agentops
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for data processing)
pip install -r requirements.txt
```

### 3. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE agentops_dev;
CREATE USER agentops WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE agentops_dev TO agentops;
\q
```

#### Option B: Docker PostgreSQL
```bash
# Start PostgreSQL container
docker run --name agentops-postgres \
  -e POSTGRES_DB=agentops_dev \
  -e POSTGRES_USER=agentops \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:14
```

### 4. Environment Configuration
Create `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://agentops:your_secure_password@localhost:5432/agentops_dev
PGHOST=localhost
PGPORT=5432
PGUSER=agentops
PGPASSWORD=your_secure_password
PGDATABASE=agentops_dev

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Session Configuration
SESSION_SECRET=your_very_secure_session_secret_here

# Environment
NODE_ENV=development
```

### 5. Database Migration
```bash
# Generate and run migrations
npm run db:generate
npm run db:migrate
```

### 6. Start Application
```bash
# Start development server
npm run dev
```

The application will be available at: http://localhost:5000

## Detailed Configuration

### Database Schema Setup
The platform automatically creates required tables:
- `servers` - Server inventory
- `server_metrics` - Real-time metrics
- `agents` - AI agent status
- `alerts` - System alerts
- `remediation_actions` - Automated fixes
- `audit_logs` - Compliance logs
- `sessions` - User sessions
- `upload_history` - File upload tracking

### Data Import
To import your server data:

```bash
# Upload server data via web interface
# OR use Python script for bulk import
python upload-helper.py --file your_servers.csv

# Upload metrics data
python upload-clean-data.py --metrics your_metrics.csv
```

### AI Agent Configuration
The platform includes 9 AI agents that start automatically:

1. **Telemetry Collector** - Processes real data only
2. **Anomaly Detector** - AI-powered issue detection
3. **Predictive Analytics** - Future problem prediction
4. **Recommendation Engine** - Suggests fixes
5. **Approval & Compliance** - Workflow management
6. **Remediation Executor** - Automated fixes
7. **Audit & Reporting** - Compliance tracking
8. **Cloud Collector** - Multi-cloud monitoring
9. **Conversational AI** - Interactive assistant

## Production Deployment

### System Configuration
```bash
# Set production environment
NODE_ENV=production

# Use production database
DATABASE_URL=postgresql://user:pass@prod-host:5432/agentops_prod

# Configure logging
LOG_LEVEL=info
LOG_FILE=/var/log/agentops/app.log
```

### Process Management
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Setup PM2 startup
pm2 startup
pm2 save
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Configuration

### Database Security
```sql
-- Create read-only user for reporting
CREATE USER agentops_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE agentops_prod TO agentops_readonly;
GRANT USAGE ON SCHEMA public TO agentops_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agentops_readonly;
```

### Network Security
```bash
# Configure firewall (UFW)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# PostgreSQL access (if external)
sudo ufw allow from trusted_ip_range to any port 5432
```

## Monitoring & Maintenance

### Health Checks
The platform provides built-in health endpoints:
- `GET /api/system/health` - System status
- `GET /api/system/api-status` - API connectivity
- `GET /api/agents` - Agent status

### Log Management
```bash
# View application logs
pm2 logs agentops

# View database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Rotate logs
sudo logrotate -f /etc/logrotate.d/agentops
```

### Backup Strategy
```bash
#!/bin/bash
# Database backup script
pg_dump agentops_prod | gzip > /backup/agentops_$(date +%Y%m%d_%H%M%S).sql.gz

# File backup
tar -czf /backup/agentops_files_$(date +%Y%m%d_%H%M%S).tar.gz /path/to/agentops
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test database connection
psql -h localhost -U agentops -d agentops_dev -c "SELECT version();"
```

#### API Key Issues
```bash
# Verify OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

#### Memory Issues
```bash
# Monitor memory usage
htop
# OR
ps aux | grep node
```

### Performance Optimization

#### Database Tuning
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_server_metrics_timestamp ON server_metrics(timestamp);
CREATE INDEX CONCURRENTLY idx_alerts_created_at ON alerts(createdAt);
CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp ON audit_logs(timestamp);
```

#### Node.js Tuning
```bash
# Set Node.js memory limit
NODE_OPTIONS="--max_old_space_size=4096" npm start
```

## Support

### Log Collection
When reporting issues, collect these logs:
```bash
# Application logs
pm2 logs --lines 100

# Database logs
sudo tail -100 /var/log/postgresql/postgresql-14-main.log

# System logs
journalctl -u agentops -n 100
```

### Configuration Validation
```bash
# Validate environment
npm run validate:env

# Check database schema
npm run db:status

# Test API endpoints
npm run test:health
```

## Updates & Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Run migrations
npm run db:migrate

# Restart application
pm2 restart agentops
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
npm audit fix

# Update Python dependencies
pip list --outdated
```

---

**Note**: This platform is designed for financial institutions and requires proper security hardening for production use. Consult with your security team before deploying in production environments.