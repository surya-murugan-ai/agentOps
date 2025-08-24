# AgenticAuto - AI-Powered Infrastructure Monitoring & Automation

A modern full-stack application for intelligent infrastructure monitoring, automated remediation, and AI-driven analytics. Built with React 18, TypeScript, Express.js, and Python.

## 🚀 Features

- **Real-time Infrastructure Monitoring**: Monitor servers, applications, and cloud resources
- **AI-Powered Analytics**: Advanced analytics with machine learning insights
- **Automated Remediation**: Intelligent automation for common infrastructure issues
- **Cloud Integration**: Support for AWS, Azure, and Google Cloud Platform
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Real-time Updates**: WebSocket-powered live updates and notifications
- **Data Management**: Comprehensive data upload, validation, and management tools

## 🏗️ Architecture

The application features a modern full-stack architecture:

- **Frontend**: React 18 + TypeScript + Vite + TanStack Query
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data Visualization**: Chart.js + Recharts
- **Backend**: Express.js + TypeScript + WebSocket
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: OpenAI + Anthropic Claude integration
- **Cloud**: AWS SDK, Azure SDK, Google Cloud SDK
- **Python Scripts**: Data processing and automation utilities

## 📋 Prerequisites

- Node.js 18+ 
- Python 3.11+
- PostgreSQL 12+
- Git

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AgenticAuto
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
# or if using uv
uv sync
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 4. Database Setup

```bash
# Create the database
createdb agenticauto

# Run database migrations
npm run db:push
```

### 5. Start Development Server

```bash
# Start the development server
npm run dev

# Or use the provided scripts
./start-local.sh  # Linux/Mac
start-local.bat   # Windows
```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `ANTHROPIC_API_KEY`: Anthropic API key for Claude integration
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`: Azure credentials
- `GOOGLE_APPLICATION_CREDENTIALS`: Google Cloud service account key

### Cloud Provider Setup

#### AWS
1. Create an IAM user with appropriate permissions
2. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
3. Configure `AWS_REGION`

#### Azure
1. Create a service principal
2. Set Azure environment variables
3. Grant necessary permissions

#### Google Cloud
1. Create a service account
2. Download the JSON key file
3. Set `GOOGLE_APPLICATION_CREDENTIALS` path

## 📊 Usage

### Dashboard
- View real-time system metrics
- Monitor active alerts
- Track remediation actions
- Analyze performance trends

### Data Management
- Upload CSV/Excel files
- Validate data integrity
- Clean and process data
- Export processed data

### AI Features
- Conversational AI assistant
- Predictive analytics
- Automated recommendations
- Intelligent alerting

### Automation
- Configure remediation workflows
- Set up automated responses
- Monitor execution logs
- Manage approval processes

## 🧪 Testing

```bash
# Run TypeScript type checking
npm run check

# Run tests (when implemented)
npm test

# Run Python tests
python -m pytest
```

## 🐳 Docker Deployment

```bash
# Build the Docker image
docker build -t agenticauto .

# Run with Docker Compose
docker-compose up -d
```

## 📁 Project Structure

```
AgenticAuto/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                 # Express.js backend
│   ├── agents/            # AI agent modules
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── middleware/        # Express middleware
├── shared/                 # Shared TypeScript types
├── docs/                   # Documentation
├── test-data/             # Test data and scripts
└── uploads/               # File upload directory
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Review [test cases](test-cases-comprehensive.md)
- Open an issue on GitHub

## 🔄 Development Workflow

1. **Local Development**: Use `npm run dev` for hot reloading
2. **Database Changes**: Use Drizzle for schema management
3. **Testing**: Run comprehensive test suite
4. **Deployment**: Use Docker for consistent environments

## 📈 Performance

- Optimized for large datasets (10k+ records)
- Efficient data processing with streaming
- Real-time WebSocket updates
- Cached API responses
- Optimized database queries

## 🔒 Security

- Environment variable protection
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Secure session management
- API key encryption

---

**Built with ❤️ using modern web technologies**
