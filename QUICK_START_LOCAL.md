# AgentOps - Quick Local Setup

## 🚀 3-Minute Setup

### Option 1: Automated Setup (Recommended)
```bash
# Run the setup script
./setup-local.sh

# Add your API keys to .env
nano .env

# Start the application
npm run dev
```

### Option 2: Docker Setup (Easiest)
```bash
# Create .env file with your API keys
echo "OPENAI_API_KEY=your_key_here" > .env.local
echo "ANTHROPIC_API_KEY=your_key_here" >> .env.local

# Start with Docker
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f
```

### Option 3: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Setup PostgreSQL
createuser agentops
createdb agentops_dev -O agentops

# 3. Create .env file
cp .env.example .env
# Edit .env with your database and API settings

# 4. Run migrations
npm run db:migrate

# 5. Start development server
npm run dev
```

## 📊 Access Your Dashboard
Open http://localhost:5000 in your browser

## 🔑 Required API Keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/

## 📁 Upload Your Data
1. Go to Data Management > Upload Data
2. Upload your server inventory (CSV/Excel)
3. Upload your metrics data (CSV/Excel)
4. Watch the AI agents start monitoring!

## 🔧 Troubleshooting
- **Database connection issues**: Check PostgreSQL is running
- **API errors**: Verify your API keys in .env
- **Port conflicts**: Change port in package.json

## 📖 Full Documentation
See `LOCAL_DEPLOYMENT_GUIDE.md` for complete setup instructions.

## 🐳 Docker Commands
```bash
# Start services
docker-compose -f docker-compose.local.yml up -d

# Stop services
docker-compose -f docker-compose.local.yml down

# Rebuild application
docker-compose -f docker-compose.local.yml up --build

# View database
docker exec -it agentops-postgres psql -U agentops -d agentops_dev
```

---
**Ready in 3 minutes!** 🎉