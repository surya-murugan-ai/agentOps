-- Add missing columns to existing tables

-- Add missing columns to remediation_actions table
ALTER TABLE remediation_actions 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR REFERENCES users(id),
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS result JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add missing columns to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS hostname TEXT,
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS details TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Success',
ADD COLUMN IF NOT EXISTS impact TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add missing columns to agents table for additional agent types
-- The agents table should already have the basic columns, but let's make sure
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Create additional tables that might be missing
CREATE TABLE IF NOT EXISTS anomalies (
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

CREATE TABLE IF NOT EXISTS predictions (
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

CREATE TABLE IF NOT EXISTS approval_workflows (
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

CREATE TABLE IF NOT EXISTS workflow_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES approval_workflows(id),
  step_number INTEGER NOT NULL,
  step_type workflow_step_type NOT NULL,
  required_role approver_role NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  assigned_to VARCHAR REFERENCES users(id),
  approved_by VARCHAR REFERENCES users(id),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert additional agents that might be missing
INSERT INTO agents (name, type, status) VALUES 
('Recommendation Engine', 'recommender', 'active'),
('Approval & Compliance', 'approval', 'active'),
('Remediation Executor', 'executor', 'active'),
('Audit & Reporting', 'audit', 'active'),
('Cloud Collector', 'cloud_collector', 'active'),
('Conversational AI Assistant', 'conversational_ai', 'active')
ON CONFLICT DO NOTHING;
