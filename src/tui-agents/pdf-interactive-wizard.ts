import * as readline from 'readline';
import {
  PDFInput, PDFSection, ChartConfig, DiagramConfig,
  AssetReference, PDFStyling, PDFSecurity, DocumentInfo
} from '@/types/pdf';
import { ChartBuilder } from './chart-builder';
import { DiagramBuilder } from './diagram-builder';
import { AssetUploader } from './asset-uploader';
import { StyleConfigurator } from './style-configurator';
import { displaySection, confirm, selectOption } from './tui-utils';

export class PDFInteractiveWizard {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<PDFInput> {
    try {
      const documentInfo = await this.gatherDocumentInfo();
      const sections = await this.gatherSections();
      const charts = await this.gatherCharts();
      const diagrams = await this.gatherDiagrams();
      const assets = await this.gatherAssets();
      const styling = await this.gatherStyling();
      const security = await this.gatherSecurity();

      const input: PDFInput = {
        ...documentInfo,
        sections,
        charts,
        diagrams,
        assets,
        styling,
        security
      };

      await this.confirmAndGenerate(input);
      return input;
    } finally {
      this.rl.close();
    }
  }

  private async gatherDocumentInfo(): Promise<DocumentInfo> {
    displaySection('Document Information');

    const title = await this.askQuestion('Enter document title: ');
    const subtitle = await this.askQuestion('Enter subtitle (optional): ');
    const authorsStr = await this.askQuestion('Enter authors (comma-separated): ');
    const authors = authorsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
    const organization = await this.askQuestion('Enter organization (optional): ');
    const version = await this.askQuestion('Enter version (default: 1.0): ') || '1.0';

    const templateOptions = [
      { id: 'blank', label: 'Blank Document', description: 'Start with a blank canvas' },
      { id: 'report', label: 'Report Template', description: 'Professional report layout' },
      { id: 'presentation', label: 'Presentation', description: 'Slide-based presentation' },
      { id: 'manual', label: 'Technical Manual', description: 'Documentation template' },
      { id: 'proposal', label: 'Business Proposal', description: 'Professional proposal layout' }
    ];

    const template = await selectOption('Select template:', templateOptions);

    return {
      title,
      subtitle: subtitle || undefined,
      authors,
      organization: organization || undefined,
      version,
      template
    };
  }

  private async gatherSections(): Promise<PDFSection[]> {
    displaySection('Document Sections');

    const sections: PDFSection[] = [];
    let addSection = true;

    while (addSection) {
      const title = await this.askQuestion('Enter section title: ');
      const content = await this.askQuestion('Enter section content: ');
      const levelStr = await this.askQuestion('Enter heading level (1-6, default: 1): ');
      const level = parseInt(levelStr) || 1;

      sections.push({
        id: `section-${Date.now()}`,
        title,
        content,
        level,
        type: 'text'
      });

      addSection = await confirm('Add another section');
    }

    return sections;
  }

  private async gatherCharts(): Promise<ChartConfig[]> {
    displaySection('Charts and Graphs');

    const chartBuilder = new ChartBuilder();
    return await chartBuilder.run();
  }

  private async gatherDiagrams(): Promise<DiagramConfig[]> {
    displaySection('Diagrams');

    const diagramBuilder = new DiagramBuilder();
    return await diagramBuilder.run();
  }

  private async gatherAssets(): Promise<AssetReference[]> {
    displaySection('Assets and Images');

    const assetUploader = new AssetUploader();
    return await assetUploader.run();
  }

  private async gatherStyling(): Promise<PDFStyling> {
    displaySection('Document Styling');

    const styleConfigurator = new StyleConfigurator();
    return await styleConfigurator.run();
  }

  private async gatherSecurity(): Promise<PDFSecurity | undefined> {
    displaySection('Security Settings');

    const enableSecurity = await confirm('Enable password protection and encryption');

    if (!enableSecurity) {
      return undefined;
    }

    const password = await this.askQuestion('Enter password: ');
    const confirmPassword = await this.askQuestion('Confirm password: ');

    if (password !== confirmPassword) {
      console.log('Passwords do not match. Security settings not applied.');
      return undefined;
    }

    const encryptionOptions = [
      { id: 128, label: '128-bit Encryption', description: 'Standard security (compatible)' },
      { id: 256, label: '256-bit Encryption', description: 'High security (modern only)' }
    ];

    const encryption = await selectOption('Select encryption level:', encryptionOptions);

    return {
      password,
      encryption: encryption as 128 | 256,
      restrictions: {
        print: await confirm('Allow printing'),
        copy: await confirm('Allow text selection and copying'),
        modify: await confirm('Allow content modification'),
        annotate: await confirm('Allow annotations'),
        formFields: await confirm('Allow form fields'),
        assembly: await confirm('Allow document assembly')
      }
    };
  }

  private async confirmAndGenerate(input: PDFInput): Promise<void> {
    displaySection('Review and Generate');

    console.log('Document Summary:');
    console.log(`  Title: ${input.title}`);
    console.log(`  Authors: ${input.authors.join(', ')}`);
    console.log(`  Template: ${input.template}`);
    console.log(`  Sections: ${input.sections.length}`);
    console.log(`  Charts: ${input.charts.length}`);
    console.log(`  Diagrams: ${input.diagrams.length}`);
    console.log(`  Assets: ${input.assets.length}`);
    console.log('');

    const generate = await confirm('Generate PDF with these settings');

    if (!generate) {
      console.log('PDF generation cancelled.');
    }
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }
}

export default PDFInteractiveWizard;
