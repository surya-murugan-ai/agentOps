#!/bin/bash

# AgentOps Local Development Startup Script

echo "🚀 Starting AgentOps Local Development Environment"
echo "=================================================="

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command psql

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://agentops_user:agentops_password@localhost:5432/agentops_dev
PGHOST=localhost
PGPORT=5432
PGUSER=agentops_user
PGPASSWORD=agentops_password
PGDATABASE=agentops_dev

# API Keys (REQUIRED - Replace with your actual keys)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Development Settings
NODE_ENV=development
PORT=3000
EOF
    echo "📝 Created .env template. Please add your API keys before continuing."
    echo "❌ Setup incomplete. Please edit .env file with your API keys."
    exit 1
fi

# Check if API keys are configured
if grep -q "sk-your-openai-key-here" .env; then
    echo "❌ Please configure your OpenAI API key in .env file"
    exit 1
fi

echo "✅ Environment configuration found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PostgreSQL is running
echo "🗄️  Checking database connection..."
if ! pg_isready -h localhost -p 5432 -U agentops_user -d agentops_dev &> /dev/null; then
    echo "⚠️  PostgreSQL is not running or not configured."
    echo "Options:"
    echo "1. Start local PostgreSQL: sudo systemctl start postgresql"
    echo "2. Use Docker: docker-compose up postgres -d"
    echo "3. Use Neon database (update DATABASE_URL in .env)"
    
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Database connection successful"
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npm run db:push
    
    # Check if we need sample data
    echo "📊 Checking for sample data..."
    if python3 -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM servers')
    count = cur.fetchone()[0]
    if count == 0:
        print('No sample data found')
        exit(1)
    print(f'Found {count} servers')
except:
    print('Could not check sample data')
    exit(1)
"; then
        echo "✅ Sample data exists"
    else
        echo "📊 Loading sample data..."
        python3 upload-test-data.py
    fi
fi

# Final checks
echo "🔍 Running final health checks..."

# Check if build is needed
if [ ! -d "dist" ]; then
    echo "🔨 Building application..."
    npm run build
fi

echo ""
echo "🎉 Setup complete! Starting the application..."
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 API: http://localhost:3000/api"
echo "📊 Dashboard: http://localhost:3000"
echo "🤖 Agent Control: http://localhost:3000/agent-control"
echo "📈 Analytics: http://localhost:3000/analytics-advanced"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the application
npm run dev