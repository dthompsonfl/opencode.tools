/**
 * Hook Manager for Cowork Plugin System
 * 
 * Loads and dispatches hooks for event-driven scripting.
 */

import { spawn, ChildProcess } from 'child_process';
import {
  HookDefinition,
  HookEvent,
  HookContext,
  HookDecision
} from '../types';

/**
 * Default timeout for hook execution in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Hook Manager
 * Loads and dispatches hooks for events
 */
export class HookManager {
  private hooks: Map<HookEvent, HookDefinition[]>;

  /**
   * Create hook manager
   */
  constructor() {
    this.hooks = new Map<HookEvent, HookDefinition[]>();
  }

  /**
   * Load hooks from definitions
   * 
   * @param hookDefs - Array of hook definitions
   */
  public loadHooks(hookDefs: HookDefinition[]): void {
    for (const hook of hookDefs) {
      this.registerHook(hook);
    }
  }

  /**
   * Register a single hook
   * 
   * @param hook - Hook definition
   */
  public registerHook(hook: HookDefinition): void {
    for (const event of hook.events) {
      const existing = this.hooks.get(event) || [];
      existing.push(hook);
      this.hooks.set(event, existing);
    }
  }

  /**
   * Dispatch event to all registered hooks
   * 
   * @param event - Event type
   * @param context - Hook context
   * @returns Aggregated hook decision
   */
  public async dispatch(event: HookEvent, context: HookContext): Promise<HookDecision> {
    const normalizedContext: HookContext = {
      ...context,
      event,
      eventName: context.eventName || event,
    };

    const eventHooks = this.hooks.get(event) || [];
    
    if (eventHooks.length === 0) {
      return { decision: 'allow' };
    }

    // Execute all hooks for this event
    const decisions: HookDecision[] = [];
    
    for (const hook of eventHooks) {
      try {
        const decision = await this.executeHook(hook, normalizedContext);
        decisions.push(decision);
        
        // If any hook returns "block", stop processing
        if (decision.decision === 'block') {
          return decision;
        }
      } catch (error) {
        // Log error but continue processing other hooks
        console.error(`Hook "${hook.name}" failed:`, error);
      }
    }

    // Aggregate decisions
    return this.aggregateDecisions(decisions);
  }

  /**
   * Execute a single hook
   * 
   * @param hook - Hook definition
   * @param context - Hook context
   * @returns Hook decision
   */
  private async executeHook(hook: HookDefinition, context: HookContext): Promise<HookDecision> {
    const timeout = hook.timeoutMs || DEFAULT_TIMEOUT_MS;

    return new Promise<HookDecision>((resolve) => {
      let resolved = false;

      // Timeout handler
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            decision: 'deny',
            message: `Hook "${hook.name}" timed out after ${timeout}ms`
          });
        }
      }, timeout);

      try {
        // Spawn child process with hook command
        // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
        const child = spawn(hook.command, [], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Send context as JSON on stdin
        child.stdin.write(JSON.stringify(context));
        child.stdin.end();

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          clearTimeout(timeoutId);
          
          if (resolved) return;
          resolved = true;

          if (code === null) {
            resolve({ decision: 'allow' });
            return;
          }

          if (code === 0) {
            // Parse JSON response
            try {
              const decision = JSON.parse(stdout) as HookDecision;
              resolve(decision);
            } catch {
              // If not valid JSON, check exit code
              resolve({ decision: 'allow' });
            }
          } else if (code === 2) {
            // Explicit deny (exit code 2 = deny)
            resolve({
              decision: 'deny',
              message: stdout || stderr || `Hook "${hook.name}" denied`
            });
          } else {
            // Other exit codes - allow but log
            console.warn(`Hook "${hook.name}" exited with code ${code}: ${stderr}`);
            resolve({ decision: 'allow' });
          }
        });

        child.on('error', (error) => {
          clearTimeout(timeoutId);
          
          if (resolved) return;
          resolved = true;

          console.error(`Hook "${hook.name}" error:`, error);
          resolve({ decision: 'allow' });
        });
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (resolved) return;
        resolved = true;

        console.error(`Failed to execute hook "${hook.name}":`, error);
        resolve({ decision: 'allow' });
      }
    });
  }

  /**
   * Aggregate multiple hook decisions
   * 
   * @param decisions - Array of hook decisions
   * @returns Aggregated decision
   */
  private aggregateDecisions(decisions: HookDecision[]): HookDecision {
    if (decisions.length === 0) {
      return { decision: 'allow' };
    }

    // Check for block
    const block = decisions.find(d => d.decision === 'block');
    if (block) {
      return block;
    }

    // Check for deny
    const deny = decisions.find(d => d.decision === 'deny');
    if (deny) {
      return {
        decision: 'deny',
        message: decisions.map(d => d.message).filter(Boolean).join('; ')
      };
    }

    // All allowed
    return { decision: 'allow' };
  }

  /**
   * Clear all hooks
   */
  public clear(): void {
    this.hooks.clear();
  }

  /**
   * Check if any hooks are registered for event
   * 
   * @param event - Event type
   * @returns True if hooks exist
   */
  public hasHooksFor(event: HookEvent): boolean {
    const eventHooks = this.hooks.get(event);
    return eventHooks !== undefined && eventHooks.length > 0;
  }

  /**
   * Get hooks registered for an event
   * 
   * @param event - Event type
   * @returns Array of hooks
   */
  public getHooksFor(event: HookEvent): HookDefinition[] {
    return this.hooks.get(event) || [];
  }
}
