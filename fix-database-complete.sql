-- Complete database fix - Drop and recreate all tables with correct structure

-- Drop all tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS llm_usage_aggregates CASCADE;
DROP TABLE IF EXISTS llm_usage CASCADE;
DROP TABLE IF EXISTS approval_history CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS upload_history CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS anomalies CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS remediation_actions CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS agent_control_settings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS server_metrics CASCADE;
DROP TABLE IF EXISTS cloud_metrics CASCADE;
DROP TABLE IF EXISTS cloud_resources CASCADE;
DROP TABLE IF EXISTS cloud_connections CASCADE;
DROP TABLE IF EXISTS servers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS agent_settings CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS severity_level CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS remediation_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS approver_role CASCADE;
DROP TYPE IF EXISTS workflow_step_type CASCADE;
DROP TYPE IF EXISTS agent_status CASCADE;
DROP TYPE IF EXISTS agent_type CASCADE;
DROP TYPE IF EXISTS cloud_provider CASCADE;
DROP TYPE IF EXISTS cloud_resource_type CASCADE;
DROP TYPE IF EXISTS llm_provider CASCADE;
DROP TYPE IF EXISTS llm_model CASCADE;

-- Create enums
CREATE TYPE severity_level AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TYPE remediation_status AS ENUM ('pending', 'approved', 'executing', 'completed', 'failed', 'rejected');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');
CREATE TYPE approver_role AS ENUM ('operator', 'supervisor', 'manager', 'director', 'compliance_officer');
CREATE TYPE workflow_step_type AS ENUM ('basic_approval', 'compliance_check', 'impact_assessment', 'security_review', 'change_board');
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE agent_type AS ENUM ('collector', 'detector', 'predictor', 'recommender', 'approval', 'executor', 'audit', 'cloud_collector', 'conversational_ai');
CREATE TYPE cloud_provider AS ENUM ('aws', 'azure', 'gcp');
CREATE TYPE cloud_resource_type AS ENUM ('ec2', 'rds', 's3', 'elb', 'lambda', 'vm', 'sql_database', 'storage_account', 'app_service', 'function_app');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic');
CREATE TYPE llm_model AS ENUM ('gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022');

-- Create tables in correct order
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role approver_role NOT NULL DEFAULT 'operator',
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  approval_limits JSONB DEFAULT '{"maxRiskScore": 30, "maxServerCount": 5, "environments": ["development"]}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE servers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  environment TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cloud_connections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider cloud_provider NOT NULL,
  region TEXT NOT NULL,
  account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  encrypted_credentials TEXT NOT NULL,
  last_test_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cloud_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type cloud_resource_type NOT NULL,
  provider cloud_provider NOT NULL,
  region TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  configuration JSONB DEFAULT '{}',
  tags JSONB DEFAULT '{}',
  cost DECIMAL(10,2) DEFAULT 0,
  last_sync TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cloud_metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id VARCHAR NOT NULL REFERENCES cloud_resources(id),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,5) NOT NULL,
  unit TEXT NOT NULL,
  dimensions JSONB DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE server_metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id VARCHAR NOT NULL REFERENCES servers(id),
  cpu_usage DECIMAL(5,2) NOT NULL,
  memory_usage DECIMAL(5,2) NOT NULL,
  memory_total INTEGER NOT NULL,
  disk_usage DECIMAL(5,2) NOT NULL,
  disk_total INTEGER NOT NULL,
  network_latency DECIMAL(8,3),
  network_throughput DECIMAL(10,2),
  process_count INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type agent_type NOT NULL,
  status agent_status NOT NULL DEFAULT 'active',
  cpu_usage DECIMAL(5,2) DEFAULT 0,
  memory_usage DECIMAL(7,1) DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_heartbeat TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP DEFAULT NOW(),
  config JSONB DEFAULT '{}'
);

CREATE TABLE agent_control_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  realtime_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  monitoring_frequency_seconds INTEGER NOT NULL DEFAULT 60,
  auto_restart_enabled BOOLEAN NOT NULL DEFAULT true,
  max_retries INTEGER NOT NULL DEFAULT 3,
  alert_thresholds JSONB DEFAULT '{"cpuUsage": 80, "memoryUsage": 1000, "errorRate": 5, "responseTime": 5000}',
  operating_schedule JSONB DEFAULT '{"enabled": false, "timezone": "UTC", "schedule": []}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT NOT NULL,
  title TEXT,
  description TEXT,
  severity TEXT NOT NULL,
  metric_type TEXT,
  metric_value DECIMAL(10,3),
  threshold DECIMAL(10,3),
  server_id VARCHAR REFERENCES servers(id),
  agent_id VARCHAR REFERENCES agents(id),
  status alert_status NOT NULL DEFAULT 'active',
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  acknowledged_by VARCHAR REFERENCES users(id)
);

CREATE TABLE remediation_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT,
  title TEXT,
  description TEXT,
  action_type TEXT,
  confidence TEXT,
  estimated_downtime TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  alert_id VARCHAR REFERENCES alerts(id),
  server_id VARCHAR REFERENCES servers(id),
  agent_id VARCHAR REFERENCES agents(id),
  command TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by VARCHAR REFERENCES users(id),
  parameters JSONB DEFAULT '{}',
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT,
  agent_name TEXT,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL,
  impact TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  agent_id VARCHAR REFERENCES agents(id),
  server_id VARCHAR REFERENCES servers(id),
  user_id VARCHAR REFERENCES users(id),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE anomalies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id VARCHAR NOT NULL REFERENCES servers(id),
  agent_id VARCHAR REFERENCES agents(id),
  metric_type TEXT NOT NULL,
  actual_value DECIMAL(10,3) NOT NULL,
  expected_value DECIMAL(10,3),
  deviation_score DECIMAL(5,2) NOT NULL,
  severity severity_level NOT NULL,
  detection_method TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE predictions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id VARCHAR NOT NULL REFERENCES servers(id),
  agent_id VARCHAR REFERENCES agents(id),
  metric_type TEXT NOT NULL,
  current_value DECIMAL(10,3) NOT NULL,
  predicted_value DECIMAL(10,3) NOT NULL,
  prediction_time TIMESTAMP NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE approval_workflows (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  remediation_action_id VARCHAR NOT NULL REFERENCES remediation_actions(id),
  workflow_name TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  required_approvals INTEGER NOT NULL DEFAULT 1,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 1,
  status approval_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{"serverCriticality": "medium", "environment": "production", "impactAssessment": "", "businessJustification": ""}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES approval_workflows(id),
  step_number INTEGER NOT NULL,
  step_type workflow_step_type NOT NULL,
  required_role approver_role NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  assigned_to VARCHAR REFERENCES users(id),
  approved_by VARCHAR REFERENCES users(id),
  comments TEXT,
  metadata JSONB DEFAULT '{"timeoutHours": 24, "autoEscalate": false, "parallelApproval": false, "conditions": {}}',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE approval_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES approval_workflows(id),
  step_id VARCHAR REFERENCES workflow_steps(id),
  action TEXT NOT NULL,
  approver_user_id VARCHAR NOT NULL REFERENCES users(id),
  comments TEXT,
  metadata JSONB DEFAULT '{"ipAddress": "", "userAgent": ""}',
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE upload_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash VARCHAR(64) NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  upload_count INTEGER NOT NULL,
  upload_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE llm_usage (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  provider llm_provider NOT NULL,
  model llm_model NOT NULL,
  operation TEXT NOT NULL,
  request_id TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  request_duration INTEGER,
  cost DECIMAL(10,6),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE llm_usage_aggregates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  provider llm_provider NOT NULL,
  model llm_model NOT NULL,
  operation TEXT NOT NULL,
  aggregate_date TIMESTAMP NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
  total_completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
  avg_request_duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE agent_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  ai_model TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature REAL NOT NULL DEFAULT 0.1,
  system_prompt TEXT NOT NULL,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  frequency_penalty REAL NOT NULL DEFAULT 0,
  presence_penalty REAL NOT NULL DEFAULT 0,
  fine_tuning_rules JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE system_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_secure BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE integrations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  last_test_at TIMESTAMP,
  last_test_status TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO users (username, password, role, email) VALUES 
('admin', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6u', 'director', 'admin@example.com'),
('operator1', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6u', 'operator', 'op1@example.com'),
('supervisor1', '$2b$10$rQZ8K9vX2mN3pL4qR5sT6u', 'supervisor', 'sup1@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO servers (hostname, ip_address, environment, location) VALUES 
('web-server-01', '192.168.1.10', 'production', 'US-East'),
('db-server-01', '192.168.1.11', 'production', 'US-East'),
('app-server-01', '192.168.1.12', 'staging', 'US-West')
ON CONFLICT DO NOTHING;

INSERT INTO agents (name, type, status) VALUES 
('Telemetry Collector', 'collector', 'active'),
('Anomaly Detector', 'detector', 'active'),
('Predictive Analytics', 'predictor', 'active'),
('Recommendation Engine', 'recommender', 'active'),
('Approval & Compliance', 'approval', 'active'),
('Remediation Executor', 'executor', 'active'),
('Audit & Reporting', 'audit', 'active'),
('Cloud Collector', 'cloud_collector', 'active'),
('Conversational AI Assistant', 'conversational_ai', 'active')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_server_id ON alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_server_id ON remediation_actions(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_llm_usage_agent_id ON llm_usage(agent_id);
