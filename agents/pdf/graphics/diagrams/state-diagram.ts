export interface StateTransition {
  from: string;
  to: string;
  event: string;
  condition?: string;
}

export interface StateEntry {
  id: string;
  description?: string;
  entry?: string;
  exit?: string;
  do?: string;
}

export interface StateDiagramConfig {
  title?: string;
  states?: StateEntry[];
  transitions?: StateTransition[];
  startState?: string;
  endState?: string;
}

export function createStateDiagramDefinition(config: StateDiagramConfig): string {
  let definition = 'stateDiagram-v2\n';

  if (config.title) {
    definition += `  title ${config.title}\n`;
  }

  if (config.startState) {
    definition += `  [*] --> ${config.startState}\n`;
  }

  if (config.states) {
    for (const state of config.states) {
      let stateDef = `  state ${state.id}`;
      
      if (state.entry || state.exit || state.do) {
        stateDef += ' {\n';
        if (state.entry) {
          stateDef += `    entry/${state.entry}\n`;
        }
        if (state.exit) {
          stateDef += `    exit/${state.exit}\n`;
        }
        if (state.do) {
          stateDef += `    do/${state.do}\n`;
        }
        stateDef += '  }\n';
      } else if (state.description) {
        stateDef += ` : ${state.description}\n`;
      } else {
        stateDef += '\n';
      }
      
      definition += stateDef;
    }
  }

  if (config.transitions) {
    for (const trans of config.transitions) {
      let transitionStr = `  ${trans.from} --> ${trans.to}`;
      if (trans.event) {
        transitionStr += ` : ${trans.event}`;
        if (trans.condition) {
          transitionStr += ` [${trans.condition}]`;
        }
      }
      transitionStr += '\n';
      definition += transitionStr;
    }
  }

  if (config.endState) {
    definition += `  ${config.endState} --> [*]\n`;
  }

  return definition;
}

export const defaultStateDiagramDefinition = `
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing : Start
  Processing --> Success : Complete
  Processing --> Error : Fail
  Success --> [*]
  Error --> Idle : Retry
`;
