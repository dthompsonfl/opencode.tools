export interface GanttTask {
  id: string;
  name: string;
  startDate?: string;
  duration?: number;
  after?: string;
  parallel?: string;
  milestone?: boolean;
  active?: boolean;
  done?: boolean;
  crit?: boolean;
  class?: string;
}

export interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

export interface GanttConfig {
  title?: string;
  dateFormat?: string;
  axisFormat?: string;
  sections?: GanttSection[];
  excludes?: string[];
  tickInterval?: string;
}

export function createGanttDefinition(config: GanttConfig): string {
  let definition = 'gantt\n';

  if (config.title) {
    definition += `  title ${config.title}\n`;
  }

  if (config.dateFormat) {
    definition += `  dateFormat ${config.dateFormat}\n`;
  }

  if (config.axisFormat) {
    definition += `  axisFormat ${config.axisFormat}\n`;
  }

  if (config.excludes && config.excludes.length > 0) {
    definition += `  excludes ${config.excludes.join(', ')}\n`;
  }

  if (config.tickInterval) {
    definition += `  tickInterval ${config.tickInterval}\n`;
  }

  if (config.sections) {
    for (const section of config.sections) {
      definition += `  section ${section.name}\n`;
      for (const task of section.tasks) {
        let taskLine = `  ${task.name}`;
        
        if (task.milestone) {
          taskLine += ` :milestone, ${task.id}`;
        } else if (task.startDate) {
          const afterClause = task.after ? `, ${task.after}` : '';
          taskLine += ` :${task.id}, ${task.startDate}${afterClause}, ${task.duration}d`;
        }
        
        definition += taskLine + '\n';

        if (task.crit) {
          definition += `  crit ${task.id}\n`;
        }
        if (task.active) {
          definition += `  active ${task.id}\n`;
        }
        if (task.done) {
          definition += `  done ${task.id}\n`;
        }
        if (task.class) {
          definition += `  ${task.id} : ${task.class}\n`;
        }
      }
    }
  }

  return definition;
}

export const defaultGanttDefinition = `
gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Planning
  Requirements    :a1, 2024-01-01, 30d
  Design          :after a1, 20d
  section Development
  Implementation  :2024-02-01, 45d
  Testing         :2024-03-01, 20d
`;
