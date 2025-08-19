#!/bin/bash

# AgentOps Local Setup Script
# This script sets up the AgentOps platform for local development

set -e

echo "🚀 Starting AgentOps Local Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION found"
else
    print_error "Node.js not found. Please install Node.js v18 or higher"
    exit 1
fi

# Check if PostgreSQL is installed
print_status "Checking PostgreSQL installation..."
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | head -n1)
    print_success "$PG_VERSION found"
else
    print_warning "PostgreSQL not found. Installing PostgreSQL..."
    
    # Detect OS and install PostgreSQL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install postgresql@14
            brew services start postgresql@14
        else
            print_error "Homebrew not found. Please install PostgreSQL manually"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt update
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    else
        print_error "Unsupported OS. Please install PostgreSQL manually"
        exit 1
    fi
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    print_status "Installing Python dependencies..."
    if command -v pip3 &> /dev/null; then
        pip3 install -r requirements.txt
    elif command -v pip &> /dev/null; then
        pip install -r requirements.txt
    else
        print_warning "pip not found. Skipping Python dependencies"
    fi
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://agentops:agentops123@localhost:5432/agentops_dev
PGHOST=localhost
PGPORT=5432
PGUSER=agentops
PGPASSWORD=agentops123
PGDATABASE=agentops_dev

# API Keys (Replace with your actual keys)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# Environment
NODE_ENV=development
EOL
    print_success ".env file created"
    print_warning "Please update API keys in .env file before starting"
else
    print_status ".env file already exists"
fi

# Setup PostgreSQL database
print_status "Setting up PostgreSQL database..."

# Create database user and database
sudo -u postgres psql << EOL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'agentops') THEN
        CREATE USER agentops WITH PASSWORD 'agentops123';
    END IF;
END
\$\$;

DROP DATABASE IF EXISTS agentops_dev;
CREATE DATABASE agentops_dev OWNER agentops;
GRANT ALL PRIVILEGES ON DATABASE agentops_dev TO agentops;
EOL

print_success "Database setup completed"

# Run database migrations
print_status "Running database migrations..."
if npm run db:generate; then
    print_success "Database schema generated"
else
    print_warning "Schema generation failed, but continuing..."
fi

if npm run db:migrate; then
    print_success "Database migrations completed"
else
    print_warning "Migration failed, but continuing..."
fi

# Create sample data directory
mkdir -p uploads
mkdir -p logs

# Create systemd service file (optional)
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ "$EUID" -eq 0 ]; then
    print_status "Creating systemd service..."
    cat > /etc/systemd/system/agentops.service << EOL
[Unit]
Description=AgentOps AI Monitoring Platform
After=network.target postgresql.service

[Service]
Type=simple
User=\$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run dev
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=agentops
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target
EOL
    
    systemctl daemon-reload
    systemctl enable agentops
    print_success "Systemd service created"
fi

print_success "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update API keys in .env file:"
echo "   - Get OpenAI API key from: https://platform.openai.com/api-keys"
echo "   - Get Anthropic API key from: https://console.anthropic.com/"
echo ""
echo "2. Start the application:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:5000"
echo ""
echo "4. Upload your server data through the web interface or use:"
echo "   python upload-helper.py --file your_data.csv"
echo ""
print_status "For full documentation, see LOCAL_DEPLOYMENT_GUIDE.md"