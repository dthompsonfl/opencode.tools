import * as readline from 'readline';
import { DiagramConfig, DiagramType, DiagramOptions } from '@/types/pdf';
import { displaySection, confirm, selectOption } from './tui-utils';

export const diagramTemplates: Record<string, string[]> = {
  flowchart: [
    'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]',
    'graph LR\n  A --> B --> C --> D'
  ],
  sequence: [
    'sequenceDiagram\n  A->>B: Message\n  B-->>A: Response'
  ],
  gantt: [
    'gantt\n  title Project\n  section Phase 1\n  Task 1: 2024-01-01, 30d'
  ]
};

const diagramTypes: { id: DiagramType; label: string; description: string }[] = [
  { id: 'flowchart', label: 'Flowchart', description: 'Show process flows and decision trees' },
  { id: 'sequence', label: 'Sequence Diagram', description: 'Show interactions between objects' },
  { id: 'class', label: 'Class Diagram', description: 'Show class structure and relationships' },
  { id: 'state', label: 'State Diagram', description: 'Show state transitions' },
  { id: 'er', label: 'ER Diagram', description: 'Show entity relationships' },
  { id: 'gantt', label: 'Gantt Chart', description: 'Show project timeline' },
  { id: 'mindmap', label: 'Mind Map', description: 'Show hierarchical information' },
  { id: 'pie', label: 'Pie Chart', description: 'Show proportions (Mermaid)' },
  { id: 'graph', label: 'Graph', description: 'Show general graphs' }
];

export class DiagramBuilder {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<DiagramConfig[]> {
    try {
      displaySection('Diagram Builder');

      const diagrams: DiagramConfig[] = [];
      let continueAdding = true;

      while (continueAdding) {
        const diagram = await this.createNewDiagram();
        diagrams.push(diagram);

        if (diagrams.length > 0) {
          console.log('\nCurrent Diagrams:');
          diagrams.forEach((d, idx) => {
            console.log(`  ${idx + 1}. ${d.type} - ${d.title || 'Untitled'}`);
          });
        }

        continueAdding = await this.confirm('\nAdd another diagram');
      }

      return diagrams;
    } finally {
      this.rl.close();
    }
  }

  async createNewDiagram(): Promise<DiagramConfig> {
    const diagramType = await this.selectDiagramType();
    const title = await this.askQuestion('Enter diagram title: ');
    const definition = await this.enterDiagramDefinition();
    const options = await this.configureOptions();

    return {
      id: `diagram-${Date.now()}`,
      type: diagramType,
      title,
      definition,
      options
    };
  }

  private async selectDiagramType(): Promise<DiagramType> {
    return await selectOption('Select diagram type:', diagramTypes);
  }

  private async enterDiagramDefinition(): Promise<string> {
    displaySection('Diagram Definition (Mermaid Syntax)');

    const useTemplate = await this.confirm('Use a template');

    if (useTemplate) {
      const definition = await this.showTemplates();
      if (definition) {
        return definition;
      }
    }

    console.log('Enter your diagram definition (Mermaid syntax):');
    console.log('Example: graph TD\n  A[Start] --> B[Process]\n  B --> C[End]');
    console.log('');

    const definition = await this.askQuestion('Diagram definition: ');
    return definition;
  }

  async showTemplates(): Promise<string | null> {
    const templateOptions = Object.keys(diagramTemplates).map(type => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1) + ' Templates',
      description: `Choose from ${diagramTemplates[type].length} templates`
    }));

    const selectedType = await selectOption('Select template type:', templateOptions);
    const templates = diagramTemplates[selectedType];

    console.log('\nAvailable templates:');
    templates.forEach((tpl, idx) => {
      console.log(`\n${idx + 1}. ${tpl.substring(0, 80)}...`);
    });

    const choice = await this.askQuestion('\nSelect template (1-' + templates.length + '): ');
    const index = parseInt(choice) - 1;

    if (index >= 0 && index < templates.length) {
      return templates[index];
    }

    return null;
  }

  private async configureOptions(): Promise<DiagramOptions> {
    displaySection('Diagram Options');

    const themeOptions = [
      { id: 'default', label: 'Default', description: 'Standard theme' },
      { id: 'forest', label: 'Forest', description: 'Green-themed' },
      { id: 'dark', label: 'Dark', description: 'Dark mode' },
      { id: 'neutral', label: 'Neutral', description: 'Grayscale' }
    ];

    const theme = await selectOption('Select theme:', themeOptions);

    const layoutOptions = [
      { id: 'TB', label: 'Top to Bottom', description: 'Vertical layout' },
      { id: 'BT', label: 'Bottom to Top', description: 'Inverted vertical' },
      { id: 'LR', label: 'Left to Right', description: 'Horizontal layout' },
      { id: 'RL', label: 'Right to Left', description: 'Inverted horizontal' }
    ];

    const layout = await selectOption('Select layout:', layoutOptions);

    const caption = await this.askQuestion('Enter caption (optional): ');

    return {
      theme: theme as 'default' | 'forest' | 'dark' | 'neutral',
      layout: layout as 'TB' | 'BT' | 'LR' | 'RL',
      caption: caption || undefined
    };
  }

  private async previewDiagram(diagram: DiagramConfig): Promise<void> {
    displaySection('Diagram Preview');

    console.log(`Type: ${diagram.type}`);
    console.log(`Title: ${diagram.title}`);
    console.log(`Theme: ${diagram.options.theme}`);
    console.log(`Layout: ${diagram.options.layout}`);
    console.log('');

    const edit = await this.confirm('Edit diagram');
    if (edit) {
      await this.editDiagram(diagram);
    }
  }

  async editDiagram(diagram: DiagramConfig): Promise<DiagramConfig> {
    const editOptions = [
      { id: 'title', label: 'Edit Title', description: 'Change the diagram title' },
      { id: 'definition', label: 'Edit Definition', description: 'Modify diagram definition' },
      { id: 'options', label: 'Edit Options', description: 'Change diagram options' },
      { id: 'done', label: 'Done', description: 'Finish editing' }
    ];

    let editing = true;

    while (editing) {
      const choice = await selectOption('What to edit:', editOptions);

      switch (choice) {
        case 'title':
          diagram.title = await this.askQuestion('Enter new title: ');
          break;
        case 'definition':
          diagram.definition = await this.enterDiagramDefinition();
          break;
        case 'options':
          diagram.options = await this.configureOptions();
          break;
        case 'done':
          editing = false;
          break;
      }
    }

    return diagram;
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  private confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
      this.rl.question(`${question} (y/n): `, answer => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }
}

export default DiagramBuilder;
