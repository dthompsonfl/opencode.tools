/**
 * Task Router
 *
 * Intelligent task routing with load balancing, priority queues, capability matching,
 * automatic retry with exponential backoff, and graceful handling of agent failures.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { TeamManager } from '../team/team-manager';
import { CollaborationProtocol } from '../team/collaboration-protocol';
import { CapabilityMatcher, TaskRequirement, MatchResult } from './capability-matcher';

export interface QueuedTask {
  id: string;
  taskId: string;
  description: string;
  assignedAgentId?: string;
  status: 'queued' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: number; // 1-100
  createdAt: number;
  deadline?: number;
  retryCount: number;
  maxRetries: number;
  result?: unknown;
  error?: string;
  projectId?: string;
}

export interface QueueStatus {
  totalTasks: number;
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export interface WorkloadInfo {
  agentId: string;
  currentTasks: number;
  maxConcurrent: number;
  utilization: number; // 0-100
  queueDepth: number;
  averageTaskDuration: number;
}

const DEFAULT_MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 60 seconds

export class TaskRouter {
  private static instance: TaskRouter;
  private taskQueue: Map<string, QueuedTask> = new Map();
  private agentTasks: Map<string, Set<string>> = new Map(); // agentId -> taskIds
  private capabilityMatcher: CapabilityMatcher;
  private teamManager: TeamManager;
  private eventBus: EventBus;
  private collaboration: CollaborationProtocol;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.capabilityMatcher = CapabilityMatcher.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.collaboration = CollaborationProtocol.getInstance();
  }

  public static getInstance(): TaskRouter {
    if (!TaskRouter.instance) {
      TaskRouter.instance = new TaskRouter();
    }
    return TaskRouter.instance;
  }

  public static resetForTests(): void {
    if (!TaskRouter.instance) {
      return;
    }

    for (const timer of TaskRouter.instance.retryTimers.values()) {
      clearTimeout(timer);
    }
    TaskRouter.instance.retryTimers.clear();
    TaskRouter.instance.taskQueue.clear();
    TaskRouter.instance.agentTasks.clear();
    TaskRouter.instance = undefined as unknown as TaskRouter;
  }

  /**
   * Submit a new task to the queue
   */
  public submitTask(task: TaskRequirement): QueuedTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate priority score (1-100)
    const priorityScore = this.calculatePriorityScore(task);

    const queuedTask: QueuedTask = {
      id,
      taskId: task.taskId,
      description: task.description,
      status: 'queued',
      priority: priorityScore,
      createdAt: Date.now(),
      deadline: task.deadline,
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
      projectId: undefined // Will be set on assignment
    };

    this.taskQueue.set(id, queuedTask);

    logger.info(`[TaskRouter] Submitted task ${id} (${task.taskId}) with priority ${priorityScore}`);

    // Emit submission event
    this.eventBus.publish('task:submitted', {
      taskId: id,
      originalTaskId: task.taskId,
      priority: priorityScore,
      timestamp: queuedTask.createdAt
    });

    // Try to auto-assign
    this.tryAutoAssign(id);

    return queuedTask;
  }

  /**
   * Assign a task to an agent
   */
  public assignTask(taskId: string, agentId?: string): boolean {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      logger.warn(`[TaskRouter] Cannot assign non-existent task: ${taskId}`);
      return false;
    }

    if (task.status !== 'queued') {
      logger.warn(`[TaskRouter] Task ${taskId} is not in queued state: ${task.status}`);
      return false;
    }

    // Find best agent if not specified
    if (!agentId) {
      const matchResult = this.findBestAgent(task);
      if (!matchResult) {
        logger.warn(`[TaskRouter] No suitable agent found for task ${taskId}`);
        return false;
      }
      agentId = matchResult.agentId;
    }

    // Validate agent exists and is available
    const agentFound = this.findAgentInAnyTeam(agentId);
    if (!agentFound) {
      logger.warn(`[TaskRouter] Agent ${agentId} not found`);
      return false;
    }

    // Assign task
    task.assignedAgentId = agentId;
    task.status = 'assigned';

    // Track agent's tasks
    if (!this.agentTasks.has(agentId)) {
      this.agentTasks.set(agentId, new Set());
    }
    this.agentTasks.get(agentId)!.add(taskId);

    logger.info(`[TaskRouter] Assigned task ${taskId} to agent ${agentId}`);

    // Emit assignment event
    this.eventBus.publish('task:assigned', {
      taskId,
      agentId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Get the next task for an agent to work on
   */
  public getNextTaskForAgent(agentId: string): QueuedTask | undefined {
    const agentFound = this.findAgentInAnyTeam(agentId);
    if (!agentFound) {
      return undefined;
    }

    // Get tasks assigned to this agent, sorted by priority
    const agentTaskIds = this.agentTasks.get(agentId);
    if (!agentTaskIds || agentTaskIds.size === 0) {
      // Try to find unassigned tasks that match this agent
      return this.findMatchingTaskForAgent(agentId);
    }

    const tasks: QueuedTask[] = [];
    for (const taskId of agentTaskIds) {
      const task = this.taskQueue.get(taskId);
      if (task && (task.status === 'assigned' || task.status === 'queued')) {
        tasks.push(task);
      }
    }

    // Sort by priority (highest first) and deadline (earliest first)
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      }
      return a.createdAt - b.createdAt;
    });

    return tasks[0];
  }

  /**
   * Mark a task as completed
   */
  public completeTask(taskId: string, result: unknown): void {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      logger.warn(`[TaskRouter] Cannot complete non-existent task: ${taskId}`);
      return;
    }

    task.status = 'completed';
    task.result = result;

    logger.info(`[TaskRouter] Task ${taskId} completed`);

    // Emit completion event
    this.eventBus.publish('task:completed', {
      taskId,
      agentId: task.assignedAgentId,
      result,
      projectId: task.projectId,
      timestamp: Date.now()
    });

    // Clean up agent tracking
    if (task.assignedAgentId) {
      this.agentTasks.get(task.assignedAgentId)?.delete(taskId);
    }
  }

  /**
   * Mark a task as failed
   */
  public failTask(taskId: string, error: string): void {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      logger.warn(`[TaskRouter] Cannot fail non-existent task: ${taskId}`);
      return;
    }

    task.error = error;

    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      this.retryTask(taskId);
    } else {
      task.status = 'failed';
      logger.error(`[TaskRouter] Task ${taskId} failed permanently after ${task.retryCount} retries: ${error}`);

      // Emit failure event
      this.eventBus.publish('task:failed', {
        taskId,
        agentId: task.assignedAgentId,
        error,
        timestamp: Date.now()
      });
    }

    // Clean up agent tracking
    if (task.assignedAgentId) {
      this.agentTasks.get(task.assignedAgentId)?.delete(taskId);
    }
  }

  /**
   * Retry a failed task
   */
  public retryTask(taskId: string): boolean {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      return false;
    }

    if (task.retryCount >= task.maxRetries) {
      logger.warn(`[TaskRouter] Task ${taskId} has exceeded max retries`);
      return false;
    }

    task.retryCount++;
    task.status = 'queued';
    task.assignedAgentId = undefined;

    // Calculate exponential backoff delay
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, task.retryCount - 1),
      MAX_RETRY_DELAY
    );

    logger.info(`[TaskRouter] Scheduling retry ${task.retryCount}/${task.maxRetries} for task ${taskId} in ${delay}ms`);

    // Schedule retry
    const timer = setTimeout(() => {
      this.retryTimers.delete(taskId);
      this.tryAutoAssign(taskId);
    }, delay);

    this.retryTimers.set(taskId, timer);

    // Emit retry event
    this.eventBus.publish('task:retry_scheduled', {
      taskId,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      delay,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Get current queue status
   */
  public getQueueStatus(): QueueStatus {
    const tasks = Array.from(this.taskQueue.values());
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');

    const status: QueueStatus = {
      totalTasks: tasks.length,
      queued: tasks.filter(t => t.status === 'queued').length,
      inProgress: tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length,
      completed: completedTasks.length,
      failed: failedTasks.length,
      averageWaitTime: 0,
      averageProcessingTime: 0
    };

    // Calculate average wait time for completed tasks
    if (completedTasks.length > 0) {
      const now = Date.now();
      const totalWaitTime = completedTasks.reduce((sum, t) => sum + (now - t.createdAt), 0);
      status.averageWaitTime = totalWaitTime / completedTasks.length;
    }

    return status;
  }

  /**
   * Rebalance tasks across agents
   */
  public rebalanceTasks(): void {
    logger.info('[TaskRouter] Rebalancing tasks across agents');

    // Get all queued tasks
    const queuedTasks = Array.from(this.taskQueue.values())
      .filter(t => t.status === 'queued')
      .sort((a, b) => b.priority - a.priority);

    // Find best agent for each task
    for (const task of queuedTasks) {
      this.tryAutoAssign(task.id);
    }

    this.eventBus.publish('task:rebalanced', {
      timestamp: Date.now()
    });
  }

  /**
   * Get workload information for an agent
   */
  public getAgentWorkload(agentId: string): WorkloadInfo | null {
    const agentFound = this.findAgentInAnyTeam(agentId);
    if (!agentFound) {
      return null;
    }

    const taskIds = this.agentTasks.get(agentId) || new Set();
    const tasks: QueuedTask[] = [];
    for (const taskId of taskIds) {
      const task = this.taskQueue.get(taskId);
      if (task && task.status !== 'completed' && task.status !== 'failed') {
        tasks.push(task);
      }
    }

    return {
      agentId,
      currentTasks: tasks.length,
      maxConcurrent: 5, // Default max
      utilization: Math.min((tasks.length / 5) * 100, 100),
      queueDepth: tasks.filter(t => t.status === 'queued').length,
      averageTaskDuration: 0 // Would be calculated from historical data
    };
  }

  /**
   * Set task priority
   */
  public setTaskPriority(taskId: string, priority: number): boolean {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      return false;
    }

    const oldPriority = task.priority;
    task.priority = Math.max(1, Math.min(100, priority));

    logger.debug(`[TaskRouter] Changed task ${taskId} priority from ${oldPriority} to ${task.priority}`);

    this.eventBus.publish('task:priority_changed', {
      taskId,
      oldPriority,
      newPriority: task.priority,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Handle agent failure - reassign tasks
   */
  public handleAgentFailure(agentId: string): void {
    logger.warn(`[TaskRouter] Handling agent failure for ${agentId}`);

    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds || taskIds.size === 0) {
      return;
    }

    // Reassign each task
    for (const taskId of taskIds) {
      const task = this.taskQueue.get(taskId);
      if (task && task.status !== 'completed' && task.status !== 'failed') {
        // Reset task to queued state
        task.assignedAgentId = undefined;
        task.status = 'queued';

        // Try to find new agent
        const matchResult = this.findBestAgent(task, [agentId]); // Exclude failed agent
        if (matchResult) {
          this.assignTask(taskId, matchResult.agentId);
          logger.info(`[TaskRouter] Reassigned task ${taskId} from failed agent ${agentId} to ${matchResult.agentId}`);
        } else {
          logger.warn(`[TaskRouter] Could not reassign task ${taskId} - no suitable agents available`);

          // Escalate if critical task
          if (task.priority > 80) {
            this.escalateUnassignedTask(task);
          }
        }
      }
    }

    // Clear agent's tasks
    this.agentTasks.delete(agentId);

    this.eventBus.publish('task:agent_failure_handled', {
      agentId,
      tasksReassigned: taskIds.size,
      timestamp: Date.now()
    });
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): QueuedTask | undefined {
    return this.taskQueue.get(taskId);
  }

  /**
   * Get all tasks
   */
  public getAllTasks(): QueuedTask[] {
    return Array.from(this.taskQueue.values());
  }

  /**
   * Get tasks for an agent
   */
  public getTasksForAgent(agentId: string): QueuedTask[] {
    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds) return [];

    return Array.from(taskIds)
      .map(id => this.taskQueue.get(id))
      .filter((t): t is QueuedTask => t !== undefined);
  }

  /**
   * Clear all tasks (for testing)
   */
  public clear(): void {
    TaskRouter.resetForTests();
    logger.warn('[TaskRouter] All tasks cleared');
  }

  /**
   * Calculate priority score for a task
   */
  private calculatePriorityScore(task: TaskRequirement): number {
    let score = 50; // Base score

    // Adjust based on priority
    const priorityMultiplier: Record<string, number> = {
      'critical': 50,
      'high': 30,
      'medium': 10,
      'low': 0
    };
    score += priorityMultiplier[task.priority] || 0;

    // Adjust based on deadline
    if (task.deadline) {
      const now = Date.now();
      const timeRemaining = task.deadline - now;
      const oneDay = 24 * 60 * 60 * 1000;

      if (timeRemaining < oneDay) {
        score += 20; // Urgent
      } else if (timeRemaining < 3 * oneDay) {
        score += 10; // Soon
      }
    }

    // Adjust based on effort
    const effortMultiplier: Record<string, number> = {
      'small': 0,
      'medium': 5,
      'large': 10
    };
    score += effortMultiplier[task.estimatedEffort] || 0;

    return Math.max(1, Math.min(100, score));
  }

  /**
   * Try to auto-assign a task
   */
  private tryAutoAssign(taskId: string): void {
    const task = this.taskQueue.get(taskId);
    if (!task || task.status !== 'queued') {
      return;
    }

    const matchResult = this.findBestAgent(task);
    if (matchResult) {
      this.assignTask(taskId, matchResult.agentId);
    }
  }

  /**
   * Find the best agent for a task
   */
  private findBestAgent(task: QueuedTask, excludeAgents?: string[]): MatchResult | null {
    // Get all team members
    const teams = this.teamManager.listActiveTeams();
    const allMembers: import('../team/team-types').TeamMember[] = [];

    for (const team of teams) {
      for (const member of team.members.values()) {
        if (!excludeAgents?.includes(member.agentId)) {
          allMembers.push(member);
        }
      }
    }

    if (allMembers.length === 0) {
      return null;
    }

    // Create task requirement from queued task
    const taskReq: TaskRequirement = {
      taskId: task.taskId,
      description: task.description,
      requiredCapabilities: this.capabilityMatcher.parseTaskCapabilities(task.description),
      priority: this.mapPriorityNumberToString(task.priority),
      deadline: task.deadline,
      estimatedEffort: 'medium'
    };

    // Match task to agents
    const matches = this.capabilityMatcher.matchTaskToAgents(taskReq, allMembers);

    if (matches.length === 0) {
      return null;
    }

    return matches[0];
  }

  /**
   * Find a matching task for an agent
   */
  private findMatchingTaskForAgent(agentId: string): QueuedTask | undefined {
    const agentFound = this.findAgentInAnyTeam(agentId);
    if (!agentFound) {
      return undefined;
    }

    // Get all queued tasks
    const queuedTasks = Array.from(this.taskQueue.values())
      .filter(t => t.status === 'queued')
      .sort((a, b) => b.priority - a.priority);

    // Find first task that matches agent's capabilities
    for (const task of queuedTasks) {
      const taskReq: TaskRequirement = {
        taskId: task.taskId,
        description: task.description,
        requiredCapabilities: this.capabilityMatcher.parseTaskCapabilities(task.description),
        priority: this.mapPriorityNumberToString(task.priority),
        deadline: task.deadline,
        estimatedEffort: 'medium'
      };

      const score = this.capabilityMatcher.calculateMatchScore(taskReq, agentFound);
      if (score > 0) {
        return task;
      }
    }

    return undefined;
  }

  /**
   * Find an agent in any team
   */
  private findAgentInAnyTeam(agentId: string): import('../team/team-types').TeamMember | undefined {
    const teams = this.teamManager.listActiveTeams();
    for (const team of teams) {
      const member = team.members.get(agentId);
      if (member) {
        return member;
      }
    }
    return undefined;
  }

  /**
   * Escalate an unassigned task
   */
  private escalateUnassignedTask(task: QueuedTask): void {
    this.collaboration.escalate(
      'task-router',
      {
        title: `Critical Task Unassigned: ${task.taskId}`,
        description: `Task "${task.description}" could not be assigned to any available agent`,
        severity: 'high',
        context: {
          taskId: task.id,
          priority: task.priority,
          retryCount: task.retryCount
        }
      }
    );
  }

  /**
   * Map priority number to string
   */
  private mapPriorityNumberToString(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority >= 80) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'medium';
    return 'low';
  }
}

export default TaskRouter;
