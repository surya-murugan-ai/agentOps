-- Create essential database tables for AgentOps

-- Create enums safely
DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('info', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE remediation_status AS ENUM ('pending', 'approved', 'executing', 'completed', 'failed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approver_role AS ENUM ('operator', 'supervisor', 'manager', 'director', 'compliance_officer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_step_type AS ENUM ('basic_approval', 'compliance_check', 'impact_assessment', 'security_review', 'change_board');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_type AS ENUM ('collector', 'detector', 'predictor', 'recommender', 'approval', 'executor', 'audit', 'cloud_collector', 'conversational_ai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role approver_role NOT NULL DEFAULT 'operator',
  email TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  approval_limits JSONB DEFAULT '{"maxRiskScore": 30, "maxServerCount": 5, "environments": ["development"]}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
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

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
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

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
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

-- Create remediation_actions table
CREATE TABLE IF NOT EXISTS remediation_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT,
  title TEXT,
  description TEXT,
  action_type TEXT,
  confidence TEXT,
  estimated_downtime TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  server_id VARCHAR REFERENCES servers(id),
  agent_id VARCHAR REFERENCES agents(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id VARCHAR,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create server_metrics table
CREATE TABLE IF NOT EXISTS server_metrics (
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

-- Create agent_control_settings table
CREATE TABLE IF NOT EXISTS agent_control_settings (
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

-- Insert some sample data
INSERT INTO users (username, password, role, email) VALUES 
('admin', 'admin123', 'director', 'admin@example.com')
ON CONFLICT (username) DO NOTHING;

INSERT INTO servers (hostname, ip_address, environment, location) VALUES 
('server-001', '192.168.1.100', 'production', 'US-East'),
('server-002', '192.168.1.101', 'staging', 'US-West')
ON CONFLICT (hostname) DO NOTHING;

INSERT INTO agents (name, type, status) VALUES 
('Data Collector', 'collector', 'active'),
('Anomaly Detector', 'detector', 'active'),
('Predictive Analytics', 'predictor', 'active')
ON CONFLICT DO NOTHING;
