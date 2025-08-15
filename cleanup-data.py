#!/usr/bin/env python3
"""
Data Cleanup Script for AgentOps Platform
Clears existing data while preserving database structure for fresh testing
"""

import os
import requests
import json
from datetime import datetime

# Server configuration
BASE_URL = "http://localhost:5000"

def check_server_status():
    """Check if the server is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/system/api-status", timeout=5)
        return response.status_code == 200
    except:
        return False

def cleanup_data():
    """Clean up all data tables while preserving structure"""
    
    print("🧹 Starting data cleanup...")
    
    if not check_server_status():
        print("❌ Server is not running. Please start the application first.")
        return False
    
    cleanup_operations = [
        ("server_metrics", "DELETE FROM server_metrics"),
        ("predictions", "DELETE FROM predictions"), 
        ("alerts", "DELETE FROM alerts"),
        ("anomalies", "DELETE FROM anomalies"),
        ("remediation_actions", "DELETE FROM remediation_actions"),
        ("audit_logs", "DELETE FROM audit_logs"),
        ("llm_usage", "DELETE FROM llm_usage"),
        ("agent_control_settings", "DELETE FROM agent_control_settings"),
        ("servers", "DELETE FROM servers"),
    ]
    
    success_count = 0
    
    for table_name, sql_query in cleanup_operations:
        try:
            # Use the SQL execution endpoint
            response = requests.post(f"{BASE_URL}/api/execute-sql", 
                                   json={"sql_query": sql_query},
                                   headers={"Content-Type": "application/json"},
                                   timeout=30)
            
            if response.status_code == 200:
                print(f"✅ Cleaned table: {table_name}")
                success_count += 1
            else:
                print(f"⚠️  Warning cleaning {table_name}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error cleaning {table_name}: {str(e)}")
    
    print(f"\n📊 Cleanup Summary:")
    print(f"   • Tables processed: {len(cleanup_operations)}")
    print(f"   • Successfully cleaned: {success_count}")
    print(f"   • Time: {datetime.now().strftime('%H:%M:%S')}")
    
    if success_count == len(cleanup_operations):
        print("\n🎉 Data cleanup completed successfully!")
        print("   Ready for fresh data testing")
        return True
    else:
        print(f"\n⚠️  Partial cleanup - {len(cleanup_operations) - success_count} operations had issues")
        return False

def reset_agent_states():
    """Reset agent processing states"""
    print("\n🔄 Resetting agent states...")
    
    # Reset agent counters by restarting the application
    # This will clear in-memory counters and processed counts
    print("   • Agent counters will reset on next application restart")
    print("   • Circuit breakers will be cleared")
    print("   • Processing states will be reset")

if __name__ == "__main__":
    print("=" * 60)
    print("🗂️  AgentOps Data Cleanup Utility")
    print("=" * 60)
    
    # Confirm cleanup
    confirmation = input("\n⚠️  This will delete ALL existing data. Continue? (y/N): ")
    
    if confirmation.lower() in ['y', 'yes']:
        success = cleanup_data()
        reset_agent_states()
        
        if success:
            print("\n🚀 Next Steps:")
            print("   1. Upload new test data files")
            print("   2. Restart the application to reset agent states")
            print("   3. Monitor the dashboard for new data processing")
        
    else:
        print("\n❌ Cleanup cancelled by user")
    
    print("\n" + "=" * 60)