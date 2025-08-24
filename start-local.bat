@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting AgentOps Local Development Environment
echo ================================================

REM Check if required tools are installed
echo 📋 Checking prerequisites...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install it first.
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install it first.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating template...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://agentops_user:agentops_password@localhost:5432/agentops_dev
        echo PGHOST=localhost
        echo PGPORT=5432
        echo PGUSER=agentops_user
        echo PGPASSWORD=agentops_password
        echo PGDATABASE=agentops_dev
        echo.
        echo # API Keys ^(REQUIRED - Replace with your actual keys^)
        echo OPENAI_API_KEY=sk-your-openai-key-here
        echo ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
        echo.
        echo # Development Settings
        echo NODE_ENV=development
        echo PORT=3000
    ) > .env
    echo 📝 Created .env template. Please add your API keys before continuing.
    echo ❌ Setup incomplete. Please edit .env file with your API keys.
    exit /b 1
)

REM Check if API keys are configured
findstr /c:"sk-your-openai-key-here" .env >nul
if %errorlevel% equ 0 (
    echo ❌ Please configure your OpenAI API key in .env file
    exit /b 1
)

echo ✅ Environment configuration found

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Check database connection (simplified for Windows)
echo 🗄️  Checking database connection...
echo ⚠️  Database check skipped on Windows. Please ensure PostgreSQL is running.

REM Run migrations
echo 🔄 Running database migrations...
call npm run db:push

REM Check for Python (try both python and python3)
echo 📊 Checking for sample data...
where python >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
) else (
    where python3 >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python3
    ) else (
        echo ⚠️  Python not found. Skipping sample data check.
        set PYTHON_CMD=
    )
)

if defined PYTHON_CMD (
    echo 📊 Loading sample data...
    call %PYTHON_CMD% upload-test-data.py
)

REM Final checks
echo 🔍 Running final health checks...

REM Check if build is needed
if not exist "dist" (
    echo 🔨 Building application...
    call npm run build
)

echo.
echo 🎉 Setup complete! Starting the application...
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔌 API: http://localhost:3000/api
echo 📊 Dashboard: http://localhost:3000
echo 🤖 Agent Control: http://localhost:3000/agent-control
echo 📈 Analytics: http://localhost:3000/analytics-advanced
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the application with Windows-compatible environment variable
set NODE_ENV=development
call npm run dev
