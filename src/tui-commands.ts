import * as readline from 'readline';
import { registerTUITools, TUIExecutionResult } from './tui-integration';
import { TUIResearchAgent } from './tui-agents';

type ToolExecutor = (toolId: string, args: unknown) => Promise<TUIExecutionResult>;

export interface PromptAdapter {
  prompt(message: string): Promise<string>;
  pickFile(message: string): Promise<string | null>;
}

export interface ResearchCommandDependencies {
  promptAdapter?: PromptAdapter;
  executeTool?: ToolExecutor;
}

export interface TUIMenuOption {
  key: string;
  label: string;
  description: string;
  action: () => Promise<TUIExecutionResult | void>;
}

export interface TUICommandDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  menu: {
    title: string;
    description: string;
    options: TUIMenuOption[];
  };
}

export function createReadlinePromptAdapter(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout): PromptAdapter {
  return {
    async prompt(message: string): Promise<string> {
      return new Promise((resolve) => {
        const rl = readline.createInterface({ input, output });
        rl.question(`${message} `, (answer: string) => {
          rl.close();
          resolve(answer.trim());
        });
      });
    },
    async pickFile(message: string): Promise<string | null> {
      const filePath = await this.prompt(`${message} (enter path)`);
      return filePath.length > 0 ? filePath : null;
    },
  };
}

const defaultExecutor: ToolExecutor = async (toolId: string, args: unknown): Promise<TUIExecutionResult> => {
  const tools = registerTUITools();
  const tool = tools.find((item) => item.id === toolId);
  if (!tool) {
    return {
      success: false,
      runtime: 'native-agent',
      toolId,
      message: `Tool not found: ${toolId}`,
      error: `Tool not found: ${toolId}`,
    };
  }

  return tool.handler(args);
};

export function createResearchCommand(dependencies: ResearchCommandDependencies = {}): TUICommandDefinition {
  const promptAdapter = dependencies.promptAdapter || createReadlinePromptAdapter();
  const executeTool = dependencies.executeTool || defaultExecutor;

  return {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Automated client and industry research',
    category: 'Research Tools',
    menu: {
      title: 'Research Agent',
      description: 'Generate comprehensive research dossiers for client projects',
      options: [
        {
          key: '1',
          label: 'Interactive Research',
          description: 'Guided research with TUI prompts',
          action: async () => executeTool('research-agent', { mode: 'interactive' }),
        },
        {
          key: '2',
          label: 'Research from Brief',
          description: 'Research using client brief file',
          action: async () => {
            const briefPath = await promptAdapter.pickFile('Select client brief file:');
            if (!briefPath) {
              return {
                success: false,
                runtime: 'native-agent',
                toolId: 'research-agent',
                message: 'No brief file selected',
                error: 'No brief file selected',
              };
            }

            return executeTool('research-agent', {
              mode: 'brief',
              briefPath,
            });
          },
        },
        {
          key: '3',
          label: 'Quick Research',
          description: 'Fast research with minimal input',
          action: async () => {
            const company = await promptAdapter.prompt('Company name:');
            const industry = await promptAdapter.prompt('Industry:');
            const description = await promptAdapter.prompt('Description (optional):');

            if (!company || !industry) {
              return {
                success: false,
                runtime: 'native-agent',
                toolId: 'research-agent',
                message: 'Company and industry are required',
                error: 'Company and industry are required',
              };
            }

            return executeTool('research-agent', {
              mode: 'quick',
              company,
              industry,
              description,
            });
          },
        },
      ],
    },
  };
}

export function registerResearchAgentWithTUI(tuiRegistry: { registerCommand: (command: TUICommandDefinition) => void }, dependencies: ResearchCommandDependencies = {}): void {
  tuiRegistry.registerCommand(createResearchCommand(dependencies));
}

export const researchCommand = createResearchCommand();

export const tuiIntegration = {
  initialize(tuiContext: {
    tools: {
      register: (tool: {
        id: string;
        name: string;
        category: string;
        description: string;
        handlers: {
          interactive: () => Promise<TUIExecutionResult>;
          fromBrief: (briefPath: string) => Promise<TUIExecutionResult>;
          quick: (company: string, industry: string, description?: string) => Promise<TUIExecutionResult>;
        };
      }) => void;
    };
  }) {
    tuiContext.tools.register({
      id: 'research-agent',
      name: 'Research Agent',
      category: 'Research',
      description: 'Automated client and industry research',
      handlers: {
        interactive: () => defaultExecutor('research-agent', { mode: 'interactive' }),
        fromBrief: (briefPath: string) => defaultExecutor('research-agent', { mode: 'brief', briefPath }),
        quick: (company: string, industry: string, description?: string) => {
          return defaultExecutor('research-agent', { mode: 'quick', company, industry, description });
        },
      },
    });
  },
  getAgent(): TUIResearchAgent {
    return new TUIResearchAgent();
  },
};
