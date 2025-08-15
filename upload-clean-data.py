#!/usr/bin/env python3
"""
Clean data upload script for end-to-end testing
Handles proper schema mapping and data validation
"""

import pandas as pd
import requests
import json
from datetime import datetime, timedelta
import uuid
import os

BASE_URL = "http://localhost:5000"

def upload_servers():
    """Upload server data with proper schema"""
    
    # Load server data
    try:
        servers_df = pd.read_excel('attached_assets/servers_1755250222167.xlsx')
        print(f"Loaded {len(servers_df)} servers from Excel")
        
        # Clean and format server data
        servers = []
        for _, row in servers_df.iterrows():
            server = {
                "id": f"srv-{str(row.get('id', 'unknown')).zfill(3)}",
                "hostname": str(row.get('hostname', f'host-{len(servers)+1:03d}')),
                "ip_address": str(row.get('ip_address', '10.0.0.1')),
                "environment": str(row.get('environment', 'prod')).lower(),
                "location": str(row.get('location', 'datacenter-1')),
                "status": "healthy",
                "tags": {"type": "test", "source": "excel"}
            }
            servers.append(server)
        
        # Insert servers via API
        for server in servers:
            try:
                response = requests.post(f"{BASE_URL}/api/servers", json=server)
                if response.status_code in [200, 201]:
                    print(f"✅ Created server: {server['hostname']}")
                else:
                    print(f"⚠️ Server creation failed: {server['hostname']} - {response.status_code}")
            except Exception as e:
                print(f"❌ Error creating server {server['hostname']}: {e}")
        
        return len(servers)
        
    except Exception as e:
        print(f"❌ Error loading servers: {e}")
        return 0

def upload_metrics():
    """Upload metrics data from multiple Excel files"""
    
    metrics_files = [
        'attached_assets/metrics_2025-08-08_1755250222166.xlsx',
        'attached_assets/metrics_2025-08-09_1755250222165.xlsx', 
        'attached_assets/metrics_2025-08-10_1755250222165.xlsx',
        'attached_assets/metrics_2025-08-11_1755250222164.xlsx',
        'attached_assets/metrics_2025-08-12_1755250222163.xlsx',
        'attached_assets/metrics_2025-08-13_1755250222162.xlsx',
        'attached_assets/metrics_2025-08-14_1755250222161.xlsx',
        'attached_assets/metrics_2025-08-15_1755250222160.xlsx'
    ]
    
    total_metrics = 0
    
    for file_path in metrics_files:
        if not os.path.exists(file_path):
            continue
            
        try:
            df = pd.read_excel(file_path)
            print(f"Processing {len(df)} metrics from {file_path}")
            
            # Process metrics in batches
            batch_size = 100
            for i in range(0, len(df), batch_size):
                batch = df.iloc[i:i+batch_size]
                metrics_batch = []
                
                for _, row in batch.iterrows():
                    # Clean and validate metrics data
                    cpu_usage = float(row.get('cpu_usage', 0)) if pd.notna(row.get('cpu_usage')) else 0
                    memory_usage = float(row.get('memory_usage', 0)) if pd.notna(row.get('memory_usage')) else 0
                    
                    # Ensure values are within valid range
                    cpu_usage = max(0, min(100, cpu_usage))
                    memory_usage = max(0, min(100, memory_usage))
                    
                    metric = {
                        "id": str(uuid.uuid4()),
                        "server_id": f"srv-{str(row.get('server_id', '001')).split('-')[-1].zfill(3)}",
                        "cpu_usage": str(cpu_usage),
                        "memory_usage": str(memory_usage), 
                        "memory_total": 16384,  # 16GB default
                        "disk_usage": str(max(0, min(100, float(row.get('disk_usage', 50))))),
                        "disk_total": 500,  # 500GB default
                        "network_latency": max(0, float(row.get('network_latency', 10))),
                        "network_throughput": max(0, float(row.get('network_throughput', 100))),
                        "process_count": max(0, int(row.get('process_count', 50))),
                        "timestamp": row.get('timestamp', datetime.now()).strftime('%Y-%m-%d %H:%M:%S')
                    }
                    metrics_batch.append(metric)
                
                # Upload batch via API
                try:
                    response = requests.post(f"{BASE_URL}/api/metrics", json={"metrics": metrics_batch})
                    if response.status_code in [200, 201]:
                        total_metrics += len(metrics_batch)
                        print(f"✅ Uploaded {len(metrics_batch)} metrics")
                    else:
                        print(f"⚠️ Metrics upload failed: {response.status_code}")
                except Exception as e:
                    print(f"❌ Error uploading metrics batch: {e}")
                    
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
    
    return total_metrics

def run_comprehensive_test():
    """Run comprehensive end-to-end test"""
    
    print("🚀 Starting Comprehensive End-to-End Testing")
    print("=" * 60)
    
    # Step 1: Upload servers
    print("\n📊 Step 1: Uploading Server Data")
    servers_count = upload_servers()
    
    # Wait for server processing
    if servers_count > 0:
        print(f"⏳ Waiting 10 seconds for server processing...")
        import time
        time.sleep(10)
        
        # Step 2: Upload metrics 
        print("\n📈 Step 2: Uploading Metrics Data")
        metrics_count = upload_metrics()
        
        if metrics_count > 0:
            print(f"⏳ Waiting 30 seconds for agent processing...")
            time.sleep(30)
            
            # Step 3: Test all agents
            print("\n🤖 Step 3: Testing All AI Agents")
            test_all_agents()
            
        else:
            print("❌ No metrics uploaded - cannot test agents")
    else:
        print("❌ No servers uploaded - cannot proceed")

def test_all_agents():
    """Test each agent and verify outputs"""
    
    agents = [
        "telemetry-collector-001",
        "anomaly-detector-001", 
        "predictive-analytics-001",
        "recommendation-engine-001",
        "approval-compliance-001",
        "remediation-executor-001",
        "audit-reporting-001"
    ]
    
    for agent_id in agents:
        try:
            response = requests.get(f"{BASE_URL}/api/agents/{agent_id}/details")
            if response.status_code == 200:
                data = response.json()
                agent = data['agent']
                activities = data['recentActivities']
                
                print(f"\n🔍 {agent['name']}:")
                print(f"   Status: {agent['status']}")
                print(f"   Processed: {agent.get('processedCount', 0)}")
                print(f"   Recent Activities: {len(activities.get('auditLogs', []))}")
                
                if len(activities.get('auditLogs', [])) > 0:
                    print(f"   ✅ Agent is processing data")
                else:
                    print(f"   ⚠️  No recent activity")
                    
        except Exception as e:
            print(f"❌ Error testing {agent_id}: {e}")
    
    # Test data outputs
    print("\n📋 Testing System Outputs:")
    
    endpoints = [
        ("/api/servers", "Servers"),
        ("/api/alerts", "Alerts"), 
        ("/api/anomalies", "Anomalies"),
        ("/api/predictions", "Predictions"),
        ("/api/remediation-actions", "Remediation Actions"),
        ("/api/audit-logs", "Audit Logs")
    ]
    
    for endpoint, name in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else 0
                print(f"   {name}: {count} records")
                
                if count > 0:
                    print(f"   ✅ {name} generated successfully")
                else:
                    print(f"   ⚠️  No {name} found")
            else:
                print(f"   ❌ Error fetching {name}: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error testing {name}: {e}")

if __name__ == "__main__":
    run_comprehensive_test()