#!/usr/bin/env python3
import pandas as pd
import sys
import json

def process_excel_file(filepath):
    try:
        # Read Excel file
        df = pd.read_excel(filepath)
        
        # Convert to JSON
        data = df.to_dict('records')
        
        print(json.dumps(data, indent=2, default=str))
        return True
    except Exception as e:
        print(f"Error processing file: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python upload-helper.py <excel_file>", file=sys.stderr)
        sys.exit(1)
    
    filepath = sys.argv[1]
    if not process_excel_file(filepath):
        sys.exit(1)