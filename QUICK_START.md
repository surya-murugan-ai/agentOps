# AgentOps - Quick Start Guide

## 🚀 Three Ways to Run Locally

### Option 1: Simple Script (Recommended)
```bash
# Make script executable and run
chmod +x start-local.sh
./start-local.sh
```

### Option 2: Docker Compose (Easiest)
```bash
# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Start everything
docker-compose up

# Access at http://localhost:3000
```

### Option 3: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Set up database
npm run db:push

# 4. Load sample data
python upload-test-data.py

# 5. Start application
npm run dev
```

## 🔑 Required API Keys

You MUST have these API keys:

### OpenAI API Key (Required)
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Add to .env: `OPENAI_API_KEY=sk-your-key-here`

### Anthropic API Key (Optional)
1. Go to https://console.anthropic.com/
2. Create API key
3. Add to .env: `ANTHROPIC_API_KEY=sk-ant-your-key-here`

## 🗄️ Database Options

### Option A: Use Neon (Recommended - Free)
1. Sign up at https://neon.tech
2. Create database
3. Copy connection string to .env

### Option B: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb agentops_dev
```

## 🎯 Key URLs After Setup

- **Main Dashboard**: http://localhost:3000
- **Agent Control**: http://localhost:3000/agent-control  
- **Advanced Analytics**: http://localhost:3000/analytics-advanced
- **API Health**: http://localhost:3000/api/health
- **API Status**: http://localhost:3000/api/system/api-status

## ⚠️ Common Issues & Quick Fixes

### "quota_exceeded" Error
```bash
# Check API status
curl http://localhost:3000/api/system/api-status

# The system auto-optimizes to reduce API calls
# Check the logs - you'll see messages like:
# "Recent predictions exist, skipping AI analysis to save API costs"
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Or use Docker
docker-compose up postgres -d
```

### Port 3000 in Use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Missing Dependencies
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🤖 AI Optimization Features

The system includes smart API usage optimization:

- **Change Detection**: Only runs AI when data actually changes
- **Cooldown Periods**: Prevents excessive API calls
- **Circuit Breakers**: Stops agents when limits reached
- **Context Caching**: Reuses data to reduce database queries

Expected API cost reduction: **85-90%**

## 📊 Monitoring Your Setup

### Check System Health
```bash
# API status
curl http://localhost:3000/api/system/api-status

# Agent status
curl http://localhost:3000/api/agents

# Recent metrics
curl http://localhost:3000/api/dashboard/metrics
```

### View Logs
- Terminal output shows all agent activity
- Look for optimization messages like "skipping AI analysis to save API costs"
- Browser DevTools shows frontend errors

## 🔧 Development Tips

### Reduce API Usage Further (Optional)
Edit `server/agents/index.ts` to increase intervals:
```typescript
const TELEMETRY_INTERVAL = 60000;  // 1 min instead of 30 sec
const ANOMALY_INTERVAL = 300000;   // 5 min instead of 1 min
```

### Test with Limited Data
```bash
# Load smaller dataset
python upload-test-data.py --limit 50
```

### Disable Specific Agents
```bash
# Disable via API
curl -X POST http://localhost:3000/api/agents/anomaly-detector-001/enable-monitoring \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## 🆘 Getting Help

1. **Check the logs** in your terminal
2. **Visit API status**: http://localhost:3000/api/system/api-status
3. **Check agent dashboard**: http://localhost:3000/agent-control
4. **Review the full setup guide**: `LOCAL_SETUP_GUIDE.md`

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ All agents showing "active" status
- ✅ Server metrics being collected
- ✅ Dashboard showing real data
- ✅ Optimization messages in logs
- ✅ API status showing "active"