import * as readline from 'readline';
import { PDFInteractiveWizard } from './pdf-interactive-wizard';
import { displaySection, selectOption } from './tui-utils';

export interface MenuOption {
  id: string;
  label: string;
  description: string;
}

export const mainMenuOptions: MenuOption[] = [
  { id: 'create', label: 'Create New PDF', description: 'Create a new PDF from scratch' },
  { id: 'template', label: 'Use Template', description: 'Start from a professional template' },
  { id: 'edit', label: 'Edit Existing', description: 'Modify a previously generated PDF' },
  { id: 'batch', label: 'Batch Generation', description: 'Generate multiple PDFs at once' },
  { id: 'settings', label: 'Settings', description: 'Configure PDF Generator preferences' },
  { id: 'back', label: 'Back to Main Menu', description: 'Return to main menu' }
];

export class PDFMenu {
  private rl: readline.Interface;
  private running: boolean;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.running = true;
  }

  async display(): Promise<void> {
    while (this.running) {
      this.displayMainMenu();

      const choice = await this.askQuestion('\nSelect an option (1-6): ');
      const index = parseInt(choice) - 1;

      if (index >= 0 && index < mainMenuOptions.length) {
        const selected = mainMenuOptions[index];
        await this.handleMenuSelection(selected.id);
      } else {
        console.log('Invalid option. Please try again.');
        await this.askQuestion('Press Enter to continue...');
      }
    }
  }

  private displayMainMenu(): void {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                     PDF Generator Menu                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');

    mainMenuOptions.forEach((opt, idx) => {
      const icon = this.getMenuIcon(opt.id);
      console.log(`  ${idx + 1}. ${icon} ${opt.label}`);
      console.log(`     ${opt.description}`);
      console.log('');
    });
  }

  private getMenuIcon(id: string): string {
    const icons: Record<string, string> = {
      create: '📄',
      template: '📋',
      edit: '✏️',
      batch: '📚',
      settings: '⚙️',
      back: '⬅️'
    };
    return icons[id] || '•';
  }

  private async handleMenuSelection(optionId: string): Promise<void> {
    switch (optionId) {
      case 'create':
        await this.handleCreateNew();
        break;
      case 'template':
        await this.handleUseTemplate();
        break;
      case 'edit':
        await this.handleEditExisting();
        break;
      case 'batch':
        await this.handleBatchGeneration();
        break;
      case 'settings':
        await this.handleSettings();
        break;
      case 'back':
        this.running = false;
        break;
    }
  }

  private async handleCreateNew(): Promise<void> {
    console.clear();
    displaySection('Create New PDF');

    console.log('Starting new PDF creation wizard...');
    const wizard = new PDFInteractiveWizard();
    await wizard.run();

    await this.askQuestion('\nPress Enter to return to menu...');
  }

  private async handleUseTemplate(): Promise<void> {
    console.clear();
    displaySection('Use Template');

    const templateOptions = [
      { id: 'report', label: 'Report Template', description: 'Professional report with headers and sections' },
      { id: 'proposal', label: 'Proposal Template', description: 'Business proposal layout' },
      { id: 'manual', label: 'Technical Manual', description: 'Documentation template' },
      { id: 'presentation', label: 'Presentation Template', description: 'Slide-based presentation' },
      { id: 'whitepaper', label: 'Whitepaper Template', description: 'In-depth whitepaper layout' }
    ];

    const template = await selectOption('Select a template:', templateOptions);

    console.log(`\nStarting ${template} wizard...`);
    const wizard = new PDFInteractiveWizard();
    await wizard.run();

    await this.askQuestion('\nPress Enter to return to menu...');
  }

  private async handleEditExisting(): Promise<void> {
    console.clear();
    displaySection('Edit Existing PDF');

    const filePath = await this.askQuestion('Enter the path to the PDF you want to edit: ');

    console.log(`\nLoading ${filePath}...`);
    console.log('Note: Full PDF editing requires the PDF to be converted to editable format.');

    await this.askQuestion('\nPress Enter to return to menu...');
  }

  private async handleBatchGeneration(): Promise<void> {
    console.clear();
    displaySection('Batch Generation');

    console.log('Batch PDF generation allows you to create multiple PDFs from:');
    console.log('  - Multiple input files');
    console.log('  - Data file (CSV/JSON)');
    console.log('  - Template with variable data');
    console.log('');

    const useBatch = await this.confirm('Would you like to set up batch generation?');

    if (useBatch) {
      const source = await this.selectBatchSource();
      console.log(`\nBatch generation configured for: ${source}`);
    }

    await this.askQuestion('\nPress Enter to return to menu...');
  }

  private async selectBatchSource(): Promise<string> {
    const sources = [
      { id: 'files', label: 'Multiple Files', description: 'Process a list of input files' },
      { id: 'data', label: 'Data File', description: 'Generate from CSV/JSON data' },
      { id: 'template', label: 'Template with Variables', description: 'Use template with variable substitution' }
    ];

    return await selectOption('Select batch source:', sources);
  }

  private async handleSettings(): Promise<void> {
    console.clear();
    displaySection('Settings');

    const settingOptions = [
      { id: 'output', label: 'Output Settings', description: 'Configure default output directory and naming' },
      { id: 'defaults', label: 'Document Defaults', description: 'Set default styling and options' },
      { id: 'security', label: 'Security Defaults', description: 'Configure default security settings' },
      { id: 'advanced', label: 'Advanced', description: 'Advanced configuration options' },
      { id: 'back', label: 'Back', description: 'Return to main menu' }
    ];

    const choice = await selectOption('Select settings category:', settingOptions);

    if (choice !== 'back') {
      console.log(`\n${choice} settings (configuration placeholder)`);
      await this.askQuestion('\nPress Enter to continue...');
    }
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

export default PDFMenu;
