# AgentOps - AI Server Monitoring Platform

## Overview

AgentOps is an AI-powered server health monitoring and automated remediation platform designed for financial institutions, insurance companies, and trading firms. The system provides proactive monitoring of mission-critical servers through real-time telemetry collection, anomaly detection, predictive analytics, and automated remediation workflows. It features a comprehensive dashboard for visualizing server health, managing alerts, and overseeing AI agent operations.

## Recent Changes (January 14, 2025)

- **Complex Multi-Step Approval Workflows Complete**: Implemented comprehensive workflow management system as explicitly requested by user
- **Database Schema Extension**: Added 4 new workflow tables (remediation_workflows, approval_chains, workflow_steps, workflow_approvals) with full relations
- **Advanced Workflow Service**: Built sophisticated WorkflowService with risk-based approval routing, organizational hierarchy logic, and automated escalation
- **Smart Approval Chains**: Dynamic approval chain generation based on risk scores, environment criticality, and server importance
- **Role-Based Workflow UI**: Created comprehensive workflow management interface with role selection, bulk operations, and real-time approval processing
- **Workflow Navigation Integration**: Added Workflows page to main navigation with GitBranch icon and proper routing
- **API Infrastructure Complete**: Full RESTful workflow API with statistics, history tracking, and event streaming capabilities
- **Risk Assessment Engine**: Automatic risk scoring for remediation actions with intelligent approval routing logic

- **Data Agent Enhancement Complete**: Successfully implemented comprehensive data normalization and cleaning features including duplicate removal, missing value handling, and data quality validation as requested by the user
- **Storage Layer Expansion**: Added missing database methods (updateServer, deleteServers, updateMetric, deleteMetrics, updateAlert) to support advanced data cleaning operations
- **API Infrastructure**: Created dedicated dataCleaningRoutes.ts with REST endpoints for data normalization, duplicate detection, and cleaning functionality  
- **Data Cleaning Implementation**: Built advanced dataAgent.ts with sophisticated algorithms for data normalization, duplicate detection, missing value handling, and data quality validation
- **Technical Debt Resolution**: Fixed TypeScript errors and database method inconsistencies across the storage layer
- **Template-Based Data Tables Complete**: Updated all data table structures to match user-provided Excel templates
- **Alert Table Structure**: Columns now display hostname, title, description, severity, metricType, metricValue, threshold per template
- **Remediation Actions Table**: Updated to show hostname, title, description, actionType, confidence, estimatedDowntime, status structure
- **Audit Logs Table**: Restructured with hostname, agentName, action, details, status, impact, timestamp columns
- **Smart Upload System Enhanced**: AI system properly detects and maps template structures with 95% confidence
- **Database Schema Updated**: Core tables now support both template fields and internal system functionality
- **Data Consistency Complete**: Eliminated all hardcoded values across the entire platform for authentic data representation
- **Dynamic Dashboard**: System Performance, Analytics, and all metrics now calculate from real database data instead of cached values

## Previous Changes (January 13, 2025)

- **Navigation System Completed**: Fixed all navigation links using Wouter routing with proper page highlighting
- **Database Schema Finalized**: Migrated memory usage column to decimal type and resolved foreign key constraints  
- **Complete Page Set**: Added Servers, Agents, Alerts, Remediations, Audit Logs, and Analytics pages with full functionality
- **Demo Data Populated**: 5 servers with realistic metrics, alerts, and remediation actions for demonstration
- **AI Agent System Operational**: All 7 agents running successfully with proper approval workflows
- **Real-time Updates**: WebSocket integration providing live dashboard updates and notifications
- **Live Data Integration**: Complete data upload system for testing agents with real infrastructure data
- **Data Management Console**: Comprehensive table-based interface for viewing and managing all system data
- **CSV/Excel Upload Feature**: Added comprehensive file upload support with automatic data type detection
- **Comprehensive Test Suite**: Created 126 test cases covering all system aspects with detailed execution results
- **Synthetic Test Data**: Generated realistic production-grade test data for thorough system validation
- **Performance Validation**: Successfully tested system with multiple concurrent operations and data processing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The application follows a modern full-stack architecture with a React frontend and Express.js backend, connected through REST APIs and WebSocket for real-time communication.

**Frontend Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- TanStack Query for server state management and caching
- Wouter for lightweight client-side routing
- Tailwind CSS with shadcn/ui components for consistent styling
- Chart.js for data visualization and metrics display

**Backend Stack:**
- Express.js with TypeScript for the API server
- WebSocket integration for real-time updates and notifications
- Modular agent system with 7 specialized AI agents for different monitoring tasks
- RESTful API design with proper error handling and logging middleware

### Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations and migrations.

**Core Tables:**
- `servers` - Server inventory with status and metadata
- `server_metrics` - Time-series telemetry data (CPU, memory, disk, network)
- `agents` - AI agent registry and status tracking
- `alerts` - Alert management with severity levels and acknowledgment
- `remediation_actions` - Automated remediation workflow tracking
- `anomalies` - Anomaly detection results storage
- `predictions` - Predictive analytics outcomes
- `audit_logs` - Complete audit trail for compliance

**Data Models:**
The schema includes enums for standardized status values (severity levels, alert statuses, remediation statuses) and uses JSONB for flexible metadata storage.

### AI Agent System
A microservices-inspired agent architecture handles different aspects of monitoring:

**Agent Types:**
1. **Telemetry Collector** - Gathers server metrics every 30 seconds
2. **Anomaly Detector** - Identifies unusual patterns in server behavior
3. **Predictive Analytics** - Forecasts potential issues using historical data
4. **Recommendation Engine** - Suggests remediation actions based on detected issues
5. **Approval & Compliance** - Manages approval workflows for sensitive operations
6. **Remediation Executor** - Executes approved automated fixes
7. **Audit & Reporting** - Maintains compliance logs and generates reports
8. **Data Agent** - Provides comprehensive data cleaning, normalization, and quality validation capabilities

Each agent runs independently with configurable intervals and maintains its own status and metrics.

**Data Agent Features:**
- **Duplicate Detection and Removal** - Identifies and removes duplicate servers, metrics, and alerts based on key fields
- **Missing Value Handling** - Automatically fills in missing data with appropriate defaults or calculated values
- **Outlier Detection** - Identifies and corrects data outliers (e.g., CPU usage > 100%)
- **Data Quality Scoring** - Calculates quality scores for different data types to track improvement
- **Comprehensive Cleaning** - Performs full data cleaning across all data types with detailed reporting

### Real-Time Communication
WebSocket integration provides live updates for:
- New alert notifications with severity-based styling
- Remediation action status changes
- Agent health monitoring
- Dashboard metrics refreshing

The WebSocket manager handles client connections, message routing, and automatic reconnection.

### State Management
The frontend uses TanStack Query for:
- Automatic caching and background refetching
- Real-time data synchronization
- Optimistic updates for user interactions
- Error handling and retry logic

Query invalidation ensures data consistency when actions are performed (like approving remediation actions).

### UI/UX Architecture
The dashboard follows a dark theme design optimized for monitoring environments:
- Fixed sidebar navigation with real-time status indicators
- Responsive grid layout for metrics and charts
- Toast notifications for user feedback
- Loading states and skeleton screens for better perceived performance

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database for production deployment
- **Drizzle ORM**: Type-safe database toolkit with automatic migrations
- **connect-pg-simple**: Session store for PostgreSQL integration

### UI Component Libraries
- **Radix UI**: Accessible, unstyled component primitives for complex UI elements
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind CSS
- **Lucide React**: Consistent icon library for the entire interface

### Development Tools
- **Vite**: Fast development server with hot module replacement
- **TypeScript**: Type safety across the entire codebase
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### Data Visualization
- **Chart.js**: Flexible charting library for metrics visualization
- **react-chartjs-2**: React wrapper for Chart.js integration

### Form Management
- **React Hook Form**: Performant form library with minimal re-renders
- **Hookform/resolvers**: Validation resolvers for various schema libraries
- **Zod**: Runtime type validation for API requests and responses

### Utility Libraries
- **date-fns**: Date manipulation and formatting utilities
- **clsx**: Conditional className utility for dynamic styling
- **nanoid**: Secure unique ID generation for database records