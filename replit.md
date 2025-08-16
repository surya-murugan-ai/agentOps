# AgentOps - AI Server Monitoring Platform

## Overview
AgentOps is an AI-powered server health monitoring and automated remediation platform. It provides proactive monitoring of mission-critical servers for financial institutions, insurance companies, and trading firms through real-time telemetry, anomaly detection, predictive analytics, and automated remediation. The platform includes a comprehensive dashboard for visualizing server health, managing alerts, and overseeing AI agent operations. Its primary purpose is to ensure high availability and performance of critical server infrastructure while reducing operational costs and potential downtime.

## Recent Changes (August 16, 2025)
- **Dashboard Agent Count Fix**: Corrected "9/7 Active Agents" display error to show accurate "9/9" ratio
- **Upload Speed Optimization**: Implemented auto-server creation for large datasets with real-time progress tracking
- **Data Validation**: Enhanced upload system to handle 1790+ record files with proper server ID mapping (SRV-001 → server1, etc.)
- **Production Alert Management**: Fixed circuit breaker issue that was blocking critical alerts, implemented intelligent overflow management with auto-resolution of old alerts and critical-only mode
- **Real Data Only Policy**: Completely removed synthetic data generation from Telemetry Collector - now only processes real data from uploads, external APIs, or configured data sources
- **Threshold Management System**: Built comprehensive threshold management interface with environment-specific configurations (Production/Staging/Development), full CRUD API endpoints, and real-time integration with all monitoring agents
- **Comprehensive Test Suite**: Created complete test case documentation covering all 16 major platform components with 150+ specific test scenarios
- **PRODUCTION READY**: Fixed all 28 TypeScript compilation errors, implemented enterprise-grade error handling system, added comprehensive input validation and security measures, deployed high-performance caching system, and integrated production-ready rate limiting - platform now ready for enterprise deployment

## User Preferences
- Preferred communication style: Simple, everyday language.
- Data handling: Only use real data from uploads, external APIs, or configured sources - no synthetic data generation.

## System Architecture

### Full-Stack Architecture
The application features a modern full-stack architecture. The frontend is built with React 18 and TypeScript, using Vite for development and TanStack Query for state management. Styling is handled by Tailwind CSS with shadcn/ui components, and data visualization uses Chart.js. The backend is an Express.js server with TypeScript, utilizing WebSocket for real-time communication and a modular system of specialized AI agents.

### Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe operations. Core tables include `servers`, `server_metrics`, `agents`, `alerts`, `remediation_actions`, `anomalies`, `predictions`, and `audit_logs`. The schema uses enums for standardized status values and JSONB for flexible metadata storage.

### AI Agent System
A microservices-inspired architecture comprises nine independent AI agents:
1.  **Telemetry Collector**: Gathers server metrics from real data sources (uploads, APIs, files) - no synthetic data generation.
2.  **Anomaly Detector**: Identifies unusual server behavior patterns.
3.  **Predictive Analytics**: Forecasts potential issues.
4.  **Recommendation Engine**: Suggests remediation actions.
5.  **Approval & Compliance**: Manages workflow approvals for sensitive operations.
6.  **Remediation Executor**: Executes approved automated fixes.
7.  **Audit & Reporting**: Maintains compliance logs and generates reports.
8.  **Cloud Collector**: Monitors AWS, Azure, and GCP cloud infrastructure resources.
9.  **Conversational AI**: Interactive chat assistant powered by OpenAI GPT-4o for analytics, reports, and help.

Each agent operates independently with configurable intervals, maintaining its own status and metrics.

### Real-Time Communication
WebSocket integration enables live updates for new alerts, remediation action status changes, agent health monitoring, and dashboard metrics.

### State Management
The frontend leverages TanStack Query for automatic caching, background refetching, real-time data synchronization, optimistic updates, and error handling.

### UI/UX Architecture
The dashboard features a dark theme optimized for monitoring environments. It includes fixed sidebar navigation with status indicators, a responsive grid layout for metrics and charts, toast notifications, and loading states for enhanced user experience.

## External Dependencies

### Database Services
-   **Neon Database**: Serverless PostgreSQL for production.
-   **Drizzle ORM**: Type-safe database toolkit.
-   **connect-pg-simple**: PostgreSQL session store.

### UI Component Libraries
-   **Radix UI**: Accessible, unstyled component primitives.
-   **shadcn/ui**: Pre-built components based on Radix UI and Tailwind CSS.
-   **Lucide React**: Icon library.

### Data Visualization
-   **Chart.js**: Flexible charting library.
-   **react-chartjs-2**: React wrapper for Chart.js.

### Form Management
-   **React Hook Form**: Performant form library.
-   **Hookform/resolvers**: Validation resolvers.
-   **Zod**: Runtime type validation.

### Utility Libraries
-   **date-fns**: Date manipulation.
-   **clsx**: Conditional className utility.
-   **nanoid**: Secure unique ID generation.