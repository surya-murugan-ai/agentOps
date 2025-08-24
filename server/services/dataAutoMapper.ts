/**
 * DataAutoMapper Service - Intelligent data format detection and transformation
 * Provides "idiot-proof" upload capability that handles ANY data format automatically
 */

interface ColumnMapping {
  original: string;
  mapped: string;
  confidence: number;
  pattern?: string;
}

interface DataAnalysis {
  totalRows: number;
  detectedFields: Record<string, any>;
  missingFields: string[];
  confidence: number;
  dataType: string;
  columnMappings: ColumnMapping[];
  recommendations: string[];
}

export class DataAutoMapper {
  // Standard field mappings with multiple variations and patterns
  private static readonly FIELD_MAPPINGS = {
    serverId: [
      'serverId', 'server_id', 'serverid', 'id',
      'machine_name', 'machine', 'server', 'device', 'node', 'instance',
      'Server Name', 'server name', 'Machine',
      /^srv[-_]?\d+$/i, /^server[-_]?\d+$/i
    ],
    
    hostname: [
      'hostname', 'Hostname', 'host', 'server_name',
      'Host Name', 'host name', 'Server Hostname',
      /^host[-_]?\d+$/i
    ],
    
    cpuUsage: [
      'cpuUsage', 'cpu_usage', 'cpu', 'processor_usage', 'cpu_percent',
      'CPU %', 'cpu%', 'Processor Usage', 'CPU Usage', 'cpu_utilization',
      'processor', 'cpu_load', 'cpuload', 'CPU_USAGE', 'cpu_pct'
    ],
    
    memoryUsage: [
      'memoryUsage', 'memory_usage', 'memory', 'ram', 'ram_utilization',
      'Memory %', 'memory%', 'Memory Usage', 'RAM Usage', 'mem_usage',
      'memory_percent', 'ram_usage', 'mem', 'RAM %', 'ram%', 'MEMORY_USAGE'
    ],
    
    diskUsage: [
      'diskUsage', 'disk_usage', 'disk', 'storage', 'storage_used',
      'Disk Usage %', 'disk%', 'Storage Usage', 'Disk Usage', 'storage_usage',
      'disk_percent', 'storage_percent', 'hdd', 'storage%', 'DISK_USAGE'
    ],
    
    networkLatency: [
      'networkLatency', 'network_latency', 'latency', 'ping', 'ping_time',
      'Network Delay (ms)', 'network delay', 'response_time', 'rtt',
      'ping_ms', 'latency_ms', 'network_delay', 'delay', 'NETWORK_LATENCY'
    ],
    
    processCount: [
      'processCount', 'process_count', 'processes', 'procs', 'active_tasks',
      'Process Count', 'Active Processes', 'task_count', 'running_processes',
      'proc_count', 'num_processes', 'PROCESS_COUNT', 'tasks'
    ],
    
    timestamp: [
      'timestamp', 'time', 'datetime', 'date', 'time_recorded', 'recorded_at',
      'Date Time', 'DateTime', 'Time Recorded', 'created_at', 'date_time',
      'event_time', 'log_time', 'TIME', 'TIMESTAMP', 'ts'
    ]
  };

  /**
   * Analyzes data structure to understand format and detect field mappings
   */
  static analyzeDataStructure(data: any[]): DataAnalysis {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        totalRows: 0,
        detectedFields: {},
        missingFields: Object.keys(this.FIELD_MAPPINGS),
        confidence: 0,
        dataType: 'unknown',
        columnMappings: [],
        recommendations: ['No valid data found']
      };
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const detectedFields: Record<string, any> = {};
    const columnMappings: ColumnMapping[] = [];
    const missingFields: string[] = [];

    // Track which columns have been assigned to prevent double-assignment
    const assignedColumns = new Set<string>();
    
    // Analyze each column against our field mappings
    for (const [standardField, patterns] of Object.entries(this.FIELD_MAPPINGS)) {
      let bestMatch: ColumnMapping | null = null;
      let maxConfidence = 0;

      for (const column of columns) {
        // Skip columns already assigned to higher confidence fields
        if (assignedColumns.has(column)) continue;
        
        const confidence = this.calculateFieldConfidence(column, patterns);
        if (confidence > maxConfidence && confidence > 0.5) { // Increased minimum confidence to 50%
          maxConfidence = confidence;
          bestMatch = {
            original: column,
            mapped: standardField,
            confidence,
            pattern: this.getMatchingPattern(column, patterns)
          };
        }
      }

      if (bestMatch) {
        detectedFields[standardField] = bestMatch.original;
        columnMappings.push(bestMatch);
        assignedColumns.add(bestMatch.original); // Mark column as assigned
      } else {
        missingFields.push(standardField);
      }
    }

    // Calculate detected count first
    const detectedCount = Object.keys(detectedFields).length;
    
    // Determine data type based on detected fields
    let dataType = 'metrics'; // Default assumption
    if (detectedFields.serverId && detectedFields.cpuUsage && detectedFields.memoryUsage) {
      dataType = 'server-metrics';
    } else if (detectedFields.serverId && detectedCount < 3) {
      dataType = 'servers';
    }

    // Calculate overall confidence based on data type
    let confidence: number;
    
    if (dataType === 'servers') {
      // For server inventory, we only need serverId and optionally hostname
      const requiredFields = ['serverId'];
      const requiredDetected = requiredFields.filter(field => detectedFields[field]);
      confidence = requiredDetected.length / requiredFields.length;
    } else {
      // For metrics, use all field mappings
      const totalFields = Object.keys(this.FIELD_MAPPINGS).length;
      confidence = detectedCount / totalFields;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedFields, missingFields, confidence);

    return {
      totalRows: data.length,
      detectedFields,
      missingFields,
      confidence,
      dataType,
      columnMappings,
      recommendations
    };
  }

  /**
   * Automatically maps raw data to standard format
   */
  static autoMapData(rawData: any[]): any[] {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    const analysis = this.analyzeDataStructure(rawData);
    
    // If confidence is too low, return empty array with warnings
    // Lower threshold for server data since it has fewer required fields
    const minConfidence = analysis.dataType === 'servers' ? 0.5 : 0.3;
    if (analysis.confidence < minConfidence) {
      console.warn(`⚠️ Low mapping confidence (${Math.round(analysis.confidence * 100)}%) - may not be suitable for auto-mapping`);
      return [];
    }

    console.log(`🤖 Auto-mapping with ${Math.round(analysis.confidence * 100)}% confidence`);
    console.log(`📊 Detected fields:`, analysis.detectedFields);

    return rawData.map((row, index) => {
      try {
        const mappedRow: any = {};

        // Map each detected field
        for (const [standardField, originalField] of Object.entries(analysis.detectedFields)) {
          let value = row[originalField];
          console.log(`🔍 Mapping ${originalField} -> ${standardField}: ${value}`);

          // Apply field-specific transformations
          switch (standardField) {
            case 'serverId':
              // Keep as string, clean up if needed
              mappedRow.serverId = String(value || '').trim();
              // Also try to set hostname if this looks like a hostname
              if (!mappedRow.hostname && typeof value === 'string') {
                mappedRow.hostname = value;
              }
              break;

            case 'cpuUsage':
            case 'memoryUsage':
            case 'diskUsage':
            case 'networkLatency':
              // Convert to string percentage, remove % sign if present
              mappedRow[standardField] = String(value || '0').replace('%', '').trim();
              break;

            case 'processCount':
              // Convert to number, ensure it's never null/undefined
              const numValue = Number(value || 100);
              mappedRow[standardField] = isNaN(numValue) ? 100 : numValue;
              break;

            case 'timestamp':
              // Try to parse as date, but be more careful about invalid dates
              try {
                if (value && typeof value === 'string' && value.length > 8) {
                  const parsed = new Date(value);
                  if (!isNaN(parsed.getTime())) {
                    mappedRow[standardField] = parsed;
                  } else {
                    mappedRow[standardField] = new Date(); // Default to current time
                  }
                } else {
                  mappedRow[standardField] = new Date(); // Default to current time
                }
              } catch (error) {
                mappedRow[standardField] = new Date(); // Default to current time on any error
              }
              break;

            default:
              mappedRow[standardField] = value;
          }
        }

        // Set default values for missing critical fields
        if (!mappedRow.serverId && !mappedRow.hostname) {
          mappedRow.serverId = `auto-server-${index + 1}`;
          mappedRow.hostname = `auto-server-${index + 1}`;
        }

        if (!mappedRow.timestamp) {
          mappedRow.timestamp = new Date();
        }

        // Set reasonable defaults for missing metrics - use explicit checks for undefined/null
        if (mappedRow.memoryTotal === undefined || mappedRow.memoryTotal === null) {
          mappedRow.memoryTotal = 8192;
        }
        if (mappedRow.diskTotal === undefined || mappedRow.diskTotal === null) {
          mappedRow.diskTotal = 256;
        }
        if (mappedRow.networkThroughput === undefined || mappedRow.networkThroughput === null) {
          mappedRow.networkThroughput = '0';
        }
        if (mappedRow.processCount === undefined || mappedRow.processCount === null) {
          mappedRow.processCount = 100; // Ensure this is never null for database constraint
        }

        return mappedRow;
        
      } catch (error) {
        console.warn(`⚠️ Error mapping row ${index}:`, error);
        return null;
      }
    }).filter(row => row !== null);
  }

  /**
   * Calculates confidence score for field matching
   */
  private static calculateFieldConfidence(columnName: string, patterns: (string | RegExp)[]): number {
    let maxConfidence = 0;

    for (const pattern of patterns) {
      let confidence = 0;

      if (pattern instanceof RegExp) {
        // Regex pattern matching
        if (pattern.test(columnName)) {
          confidence = 0.9; // High confidence for regex matches
        }
      } else if (typeof pattern === 'string') {
        // String pattern matching with fuzzy logic
        const normalized1 = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalized2 = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalized1 === normalized2) {
          confidence = 1.0; // Perfect match
        } else if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
          confidence = 0.8; // Contains match
        } else {
          // Calculate similarity score
          confidence = this.calculateSimilarity(normalized1, normalized2);
        }
      }

      maxConfidence = Math.max(maxConfidence, confidence);
    }

    return maxConfidence;
  }

  /**
   * Calculates string similarity using a simple algorithm
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Gets the matching pattern for debugging
   */
  private static getMatchingPattern(columnName: string, patterns: (string | RegExp)[]): string {
    for (const pattern of patterns) {
      if (pattern instanceof RegExp && pattern.test(columnName)) {
        return pattern.toString();
      } else if (typeof pattern === 'string') {
        const normalized1 = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalized2 = pattern.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized1 === normalized2 || normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
          return pattern;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Generates recommendations based on analysis
   */
  private static generateRecommendations(detectedFields: Record<string, any>, missingFields: string[], confidence: number): string[] {
    const recommendations: string[] = [];

    if (confidence < 0.5) {
      recommendations.push('Consider using a standard data template for better compatibility');
    }

    if (missingFields.includes('serverId')) {
      recommendations.push('Add a server identifier column (hostname, serverId, etc.)');
    }

    if (missingFields.includes('timestamp')) {
      recommendations.push('Include a timestamp column for proper time-series analysis');
    }

    if (missingFields.length > 5) {
      recommendations.push('Many fields are missing - this might not be server metrics data');
    }

    if (confidence > 0.8) {
      recommendations.push('High confidence mapping - data should upload successfully');
    } else if (confidence > 0.5) {
      recommendations.push('Moderate confidence - some fields may need manual verification');
    } else {
      recommendations.push('Low confidence - manual review recommended before upload');
    }

    return recommendations;
  }
}