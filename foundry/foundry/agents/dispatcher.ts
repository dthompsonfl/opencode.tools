interface Task {
  id: string
  title: string
  role: string
  status: "pending" | "in_progress" | "completed" | "failed"
  priority: "low" | "medium" | "high"
  evidence?: string[]
}

interface DispatchResult {
  taskId: string
  assigned: boolean
  reason?: string
}

interface AgentDispatcher {
  dispatch: (task: Omit<Task, "id" | "status">) => Promise<DispatchResult>
  complete: (taskId: string, evidence?: string[]) => Promise<void>
  fail: (taskId: string, reason: string) => Promise<void>
  list: (options?: { role?: string; status?: Task["status"] }) => Task[]
}

export function createAgentDispatcher(): AgentDispatcher {
  const tasks = new Map<string, Task>()
  let taskIdCounter = 0

  const dispatch = async (task: Omit<Task, "id" | "status">): Promise<DispatchResult> => {
    const taskId = `task_${++taskIdCounter}`
    const newTask: Task = {
      ...task,
      id: taskId,
      status: "pending",
    }
    tasks.set(taskId, newTask)

    // In production, this would actually dispatch to an agent
    console.log(`Dispatched task ${taskId} to ${task.role}: ${task.title}`)

    return { taskId, assigned: true }
  }

  const complete = async (taskId: string, evidence?: string[]): Promise<void> => {
    const task = tasks.get(taskId)
    if (task) {
      task.status = "completed"
      task.evidence = evidence
      tasks.set(taskId, task)
    }
  }

  const fail = async (taskId: string, reason: string): Promise<void> => {
    const task = tasks.get(taskId)
    if (task) {
      task.status = "failed"
      tasks.set(taskId, task)
    }
    console.log(`Task ${taskId} failed: ${reason}`)
  }

  const list = (options?: { role?: string; status?: Task["status"] }): Task[] => {
    let result = Array.from(tasks.values())
    if (options?.role) {
      result = result.filter((t) => t.role === options.role)
    }
    if (options?.status) {
      result = result.filter((t) => t.status === options.status)
    }
    return result
  }

  return { dispatch, complete, fail, list }
}
