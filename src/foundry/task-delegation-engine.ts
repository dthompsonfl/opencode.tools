export type DelegationTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface DelegationTask {
  id: string;
  title: string;
  roleId: string;
  priority: 'low' | 'medium' | 'high';
  dependsOn: string[];
  maxRetries: number;
  attempts: number;
  status: DelegationTaskStatus;
  payload?: Record<string, unknown>;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskDelegationEngineOptions {
  maxConcurrency?: number;
}

export class TaskDelegationEngine {
  private readonly tasks = new Map<string, DelegationTask>();

  private readonly inProgressTaskIds = new Set<string>();

  private readonly maxConcurrency: number;

  private lock: Promise<void> = Promise.resolve();

  public constructor(options: TaskDelegationEngineOptions = {}) {
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? 2);
  }

  public async addTasks(
    items: Array<Omit<DelegationTask, 'attempts' | 'status' | 'createdAt' | 'updatedAt' | 'maxRetries'> & { maxRetries?: number }>,
  ): Promise<void> {
    await this.withLock(async () => {
      const now = Date.now();
      for (const item of items) {
        if (this.tasks.has(item.id)) {
          continue;
        }

        this.tasks.set(item.id, {
          ...item,
          maxRetries: Math.max(0, item.maxRetries ?? 1),
          attempts: 0,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }

  public async getNextTask(availableRoleIds?: string[]): Promise<DelegationTask | null> {
    return this.withLock(async () => {
      if (this.inProgressTaskIds.size >= this.maxConcurrency) {
        return null;
      }

      const allowedRoles = availableRoleIds && availableRoleIds.length > 0 ? new Set(availableRoleIds) : null;
      const candidates = Array.from(this.tasks.values())
        .filter((task) => task.status === 'pending')
        .filter((task) => !allowedRoles || allowedRoles.has(task.roleId))
        .filter((task) => this.dependenciesSatisfied(task));

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => {
        const byPriority = this.priorityWeight(b.priority) - this.priorityWeight(a.priority);
        if (byPriority !== 0) {
          return byPriority;
        }

        return a.createdAt - b.createdAt;
      });

      const selected = candidates[0];
      selected.status = 'in_progress';
      selected.attempts += 1;
      selected.updatedAt = Date.now();
      this.inProgressTaskIds.add(selected.id);
      this.tasks.set(selected.id, selected);

      return { ...selected };
    });
  }

  public async markTaskCompleted(taskId: string): Promise<void> {
    await this.withLock(async () => {
      const task = this.tasks.get(taskId);
      if (!task) {
        return;
      }

      task.status = 'completed';
      task.updatedAt = Date.now();
      task.lastError = undefined;
      this.inProgressTaskIds.delete(taskId);
      this.tasks.set(taskId, task);
    });
  }

  public async markTaskFailed(taskId: string, error: string, retry = true): Promise<void> {
    await this.withLock(async () => {
      const task = this.tasks.get(taskId);
      if (!task) {
        return;
      }

      const canRetry = retry && task.attempts <= task.maxRetries;
      task.status = canRetry ? 'pending' : 'failed';
      task.lastError = error;
      task.updatedAt = Date.now();
      this.inProgressTaskIds.delete(taskId);
      this.tasks.set(taskId, task);
    });
  }

  public async resetTask(taskId: string): Promise<void> {
    await this.withLock(async () => {
      const task = this.tasks.get(taskId);
      if (!task) {
        return;
      }

      task.status = 'pending';
      task.updatedAt = Date.now();
      this.inProgressTaskIds.delete(taskId);
      this.tasks.set(taskId, task);
    });
  }

  public getTask(taskId: string): DelegationTask | null {
    const task = this.tasks.get(taskId);
    return task ? { ...task } : null;
  }

  public getTasks(): DelegationTask[] {
    return Array.from(this.tasks.values()).map((task) => ({ ...task }));
  }

  public hasRemainingWork(): boolean {
    return Array.from(this.tasks.values()).some(
      (task) => task.status === 'pending' || task.status === 'in_progress',
    );
  }

  private dependenciesSatisfied(task: DelegationTask): boolean {
    if (task.dependsOn.length === 0) {
      return true;
    }

    return task.dependsOn.every((dependencyId) => this.tasks.get(dependencyId)?.status === 'completed');
  }

  private priorityWeight(priority: DelegationTask['priority']): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const release = this.lock;
    let resolveNext: () => void = () => undefined;
    this.lock = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    await release;
    try {
      return await fn();
    } finally {
      resolveNext();
    }
  }
}
