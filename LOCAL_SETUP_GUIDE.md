# AgentOps Local Setup Guide

## Overview
This guide will walk you through setting up the AgentOps AI-powered server monitoring platform on your local machine for development and testing.

## Prerequisites

### Required Software
```bash
# Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# PostgreSQL 14+
psql --version

# Git
git --version
```

### Required API Keys
You'll need the following API keys:
- **OpenAI API Key** (required for AI agents)
- **Anthropic API Key** (optional, for Claude integration)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd agentops

# Install dependencies
npm install

# Install Python dependencies (for data processing scripts)
pip install pandas openpyxl requests
```

### 2. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install PostgreSQL (macOS with Homebrew)
brew install postgresql
brew services start postgresql

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Create database and user
sudo -u postgres psql
CREATE DATABASE agentops_dev;
CREATE USER agentops_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE agentops_dev TO agentops_user;
\q
```

#### Option B: Use Neon Database (Recommended)
1. Sign up at https://neon.tech
2. Create a new database
3. Copy the connection string

### 3. Environment Configuration

Create `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/agentops_dev
# OR for Neon:
# DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/agentops_dev

# PostgreSQL connection details (for local setup)
PGHOST=localhost
PGPORT=5432
PGUSER=agentops_user
PGPASSWORD=your_password
PGDATABASE=agentops_dev

# API Keys (REQUIRED)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Development Settings
NODE_ENV=development
PORT=3000
```

### 4. Database Migration

```bash
# Run database migrations
npm run db:push

# OR if using Drizzle directly
npx drizzle-kit push:pg
```

### 5. Seed Test Data

```bash
# Upload sample server and metric data
python upload-test-data.py

# OR upload clean synthetic data
python upload-clean-data.py
```

### 6. Start the Application

```bash
# Start in development mode
npm run dev

# This will start:
# - Backend Express server on http://localhost:3000
# - Frontend Vite dev server (served through Express)
# - All AI agents automatically
```

## Common Challenges and Solutions

### Challenge 1: Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors

**Solutions:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Test connection manually
psql -h localhost -U agentops_user -d agentops_dev

# Reset database if corrupted
npm run db:reset
```

### Challenge 2: OpenAI API Quota/Rate Limits

**Symptoms:**
- "quota_exceeded" errors in logs
- High API usage costs

**Solutions:**
```bash
# Use the built-in optimization (already implemented)
# Check API usage in dashboard at /analytics-advanced

# Reduce agent frequency (optional)
# Edit server/agents/index.ts to increase intervals

# Monitor usage
curl http://localhost:3000/api/system/api-status
```

### Challenge 3: Missing Dependencies

**Symptoms:**
- "Module not found" errors
- TypeScript compilation errors

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript issues
npm run type-check

# Rebuild if needed
npm run build
```

### Challenge 4: Port Conflicts

**Symptoms:**
- "Port already in use" errors

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000
# OR on Windows: netstat -ano | findstr :3000

# Kill the process
kill -9 <PID>

# Use different port
PORT=3001 npm run dev
```

### Challenge 5: AI Agent Errors

**Symptoms:**
- Agents showing as "inactive" or "error" status
- High error counts in agent dashboard

**Solutions:**
```bash
# Check agent logs
tail -f logs/agents.log  # If logging to file

# Restart specific agent via API
curl -X POST http://localhost:3000/api/agents/anomaly-detector-001/restart

# Disable problematic agents temporarily
curl -X POST http://localhost:3000/api/agents/anomaly-detector-001/enable-monitoring \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## Development Workflow

### 1. Making Code Changes
```bash
# Frontend changes auto-reload via Vite HMR
# Backend changes auto-restart via nodemon

# For database schema changes:
npm run db:generate  # Generate migration
npm run db:push      # Apply to database
```

### 2. Testing API Endpoints
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test dashboard data
curl http://localhost:3000/api/dashboard/metrics

# Test AI agents
curl http://localhost:3000/api/agents
```

### 3. Monitoring and Debugging
```bash
# Check real-time logs
# Frontend: Browser DevTools Console
# Backend: Terminal running npm run dev

# Monitor database
psql $DATABASE_URL -c "SELECT * FROM agents LIMIT 5;"

# Check API usage
curl http://localhost:3000/api/llm-usage/summary
```

## Performance Optimization for Local Development

### 1. Reduce Agent Frequency
Edit `server/agents/index.ts`:
```typescript
// Increase intervals for local testing
const TELEMETRY_INTERVAL = 60000;  // 1 minute instead of 30 seconds
const ANOMALY_INTERVAL = 120000;   // 2 minutes instead of 1 minute
const PREDICTION_INTERVAL = 300000; // 5 minutes instead of 2 minutes
```

### 2. Limit Historical Data
```bash
# Use smaller datasets for faster testing
python upload-test-data.py --limit 100  # Only 100 records per table
```

### 3. Disable Expensive Operations
```typescript
// In agent files, add development checks:
if (process.env.NODE_ENV === 'development') {
  // Skip expensive AI operations
  return;
}
```

## Troubleshooting Checklist

- [ ] PostgreSQL is running and accessible
- [ ] Environment variables are set correctly
- [ ] API keys are valid and have quota
- [ ] Database migrations have been applied
- [ ] Test data has been seeded
- [ ] No port conflicts exist
- [ ] Dependencies are installed correctly

## Getting Help

1. **Check Logs**: Always check the terminal output for specific error messages
2. **API Status**: Visit `/api/system/api-status` for system health
3. **Agent Dashboard**: Visit `/agent-control` for agent status
4. **Database**: Use SQL client to verify data integrity

## Production Deployment Notes

For production deployment:
1. Use environment-specific `.env` files
2. Set up proper database backups
3. Configure monitoring and alerting
4. Set up SSL/HTTPS
5. Use process managers (PM2, Docker)
6. Set up log aggregation

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all secrets
- Set up proper database user permissions
- Enable CORS only for required origins
- Use HTTPS in production