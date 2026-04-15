/**
 * Result Merger for Cowork Orchestrator
 * 
 * Deterministic merging of agent outputs.
 */

/**
 * Agent result from a single agent execution
 */
export interface AgentResult {
  /** Agent ID */
  agentId: string;
  /** Agent name */
  agentName: string;
  /** Agent output */
  output: unknown;
  /** Result metadata */
  metadata: {
    /** Run ID for this execution */
    runId: string;
    /** Timestamp of execution */
    timestamp: string;
    /** Tools used by this agent */
    toolsUsed?: string[];
    /** Whether execution succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
  };
}

/**
 * Merged result from multiple agents
 */
export interface MergedResult {
  /** Merged output */
  output: unknown;
  /** Merged metadata */
  metadata: {
    /** All agent IDs */
    agentIds: string[];
    /** All run IDs */
    runIds: string[];
    /** Latest timestamp */
    timestamp: string;
    /** All tools used across agents */
    totalToolsUsed: string[];
    /** Whether all agents succeeded */
    allSucceeded: boolean;
  };
}

/**
 * Result Merger
 * Deterministic merging of agent outputs
 */
export class ResultMerger {
  /**
   * Merge multiple agent results deterministically
   * 
   * @param results - Array of agent results
   * @returns Merged result
   */
  public merge(results: AgentResult[]): MergedResult {
    if (results.length === 0) {
      return {
        output: null,
        metadata: {
          agentIds: [],
          runIds: [],
          timestamp: new Date().toISOString(),
          totalToolsUsed: [],
          allSucceeded: true
        }
      };
    }

    // Sort results alphabetically by agent name for deterministic ordering
    const sortedResults = this.sortResults(results);

    // Merge outputs
    const mergedOutput = this.mergeOutputs(sortedResults.map(r => r.output));

    // Collect metadata
    const agentIds = sortedResults.map(r => r.agentId);
    const runIds = sortedResults.map(r => r.metadata.runId);
    const allSucceeded = sortedResults.every(r => r.metadata.success);

    // Get latest timestamp
    const timestamps = sortedResults.map(r => r.metadata.timestamp);
    const timestamp = timestamps.sort().pop() || new Date().toISOString();

    // Collect and deduplicate tools
    const allTools = sortedResults
      .flatMap(r => r.metadata.toolsUsed || []);
    const totalToolsUsed = [...new Set(allTools)];

    return {
      output: mergedOutput,
      metadata: {
        agentIds,
        runIds,
        timestamp,
        totalToolsUsed,
        allSucceeded
      }
    };
  }

  /**
   * Merge two results (useful for incremental merging)
   * 
   * @param a - First result
   * @param b - Second result
   * @returns Merged result
   */
  public mergeTwo(a: AgentResult, b: AgentResult): AgentResult {
    const merged = this.merge([a, b]);
    
    return {
      agentId: `${a.agentId}+${b.agentId}`,
      agentName: 'merged',
      output: merged.output,
      metadata: {
        runId: [...new Set([a.metadata.runId, b.metadata.runId])].join(','),
        timestamp: merged.metadata.timestamp,
        toolsUsed: merged.metadata.totalToolsUsed,
        success: merged.metadata.allSucceeded
      }
    };
  }

  /**
   * Sort results by agent name alphabetically
   * 
   * @param results - Array of agent results
   * @returns Sorted array
   */
  public sortResults(results: AgentResult[]): AgentResult[] {
    return [...results].sort((a, b) => {
      // First sort by agent name
      const nameCompare = a.agentName.localeCompare(b.agentName);
      if (nameCompare !== 0) {
        return nameCompare;
      }
      
      // If same name, sort by timestamp
      return a.metadata.timestamp.localeCompare(b.metadata.timestamp);
    });
  }

  /**
   * Deep merge two values
   * 
   * @param a - First value
   * @param b - Second value
   * @returns Merged value
   */
  public deepMerge(a: unknown, b: unknown): unknown {
    // If both are objects, merge them
    if (this.isObject(a) && this.isObject(b)) {
      const result: Record<string, unknown> = {};
      
      // Copy all keys from a
      for (const key of Object.keys(a as object)) {
        result[key] = (a as Record<string, unknown>)[key];
      }
      
      // Merge keys from b
      for (const key of Object.keys(b as object)) {
        const bValue = (b as Record<string, unknown>)[key];
        const aValue = (a as Record<string, unknown>)[key];
        
        if (key in (a as object)) {
          // Key exists in both - recursively merge
          result[key] = this.deepMerge(aValue, bValue);
        } else {
          // Key only in b - add it
          result[key] = bValue;
        }
      }
      
      return result;
    }
    
    // If both are arrays, combine with deduplication
    if (Array.isArray(a) && Array.isArray(b)) {
      return this.dedupeArray([...a, ...b]);
    }
    
    // Otherwise, b overrides a (or use a if b is null/undefined)
    return b !== null && b !== undefined ? b : a;
  }

  /**
   * Merge multiple outputs into one
   * 
   * @param outputs - Array of outputs
   * @returns Merged output
   */
  private mergeOutputs(outputs: unknown[]): unknown {
    if (outputs.length === 0) {
      return null;
    }

    if (outputs.length === 1) {
      return outputs[0];
    }

    // Start with first output
    let result = outputs[0];

    // Merge remaining outputs
    for (let i = 1; i < outputs.length; i++) {
      result = this.deepMerge(result, outputs[i]);
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Deduplicate array while preserving order
   */
  private dedupeArray(arr: unknown[]): unknown[] {
    const seen = new Set<unknown>();
    const result: unknown[] = [];

    for (const item of arr) {
      // Use JSON stringify for comparison (works for primitives and objects)
      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }
}
