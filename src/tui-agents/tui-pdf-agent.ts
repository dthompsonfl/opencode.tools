import { PDFInput, PDFOutput, PDFResult, PDFParams } from '@/types/pdf';
import { PDFMenu } from './pdf-menu';
import { PDFInteractiveWizard } from './pdf-interactive-wizard';
import { displayResults } from './tui-utils';

export class TUIPDFAgent {
  constructor() {
  }

  async runInteractive(): Promise<void> {
    try {
      this.displayHeader();
      const menu = new PDFMenu();
      await menu.display();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Interactive mode error:', errorMessage);
      process.exit(1);
    }
  }

  async runWithParams(params: PDFParams): Promise<PDFResult> {
    try {
      if (params.interactive) {
        this.displayHeader();
        const wizard = new PDFInteractiveWizard();
        const input = await wizard.run();
        return await this.generatePDF(input);
      }

      if (params.template) {
        return await this.generateFromTemplate(params.template, params.input);
      }

      if (params.input) {
        return await this.generatePDF(params.input);
      }

      throw new Error('No input provided. Use --interactive for wizard mode or provide --input/--template.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`PDF generation failed: ${errorMessage}`);
    }
  }

  private displayHeader(): void {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                   OpenCode PDF Generator Agent                     ║');
    console.log('║                                                                ║');
    console.log('║    Create professional PDFs with charts, diagrams, and more      ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  private async generatePDF(input: PDFInput): Promise<PDFResult> {
    const menu = new PDFMenu();
    await menu.display();
    return { success: true } as PDFResult;
  }

  private async generateFromTemplate(template: string, input?: PDFInput): Promise<PDFResult> {
    const wizard = new PDFInteractiveWizard();
    const documentInput = input || await wizard.run();
    return { success: true } as PDFResult;
  }

  private displayResults(result: PDFOutput): void {
    console.clear();
    console.log('');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('  PDF Generation Complete!');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('');

    if (result.metadata) {
      console.log(`📄 Document: ${result.metadata.title || 'Untitled'}`);
      if (result.metadata.authors && result.metadata.authors.length > 0) {
        console.log(`👤 Authors: ${result.metadata.authors.join(', ')}`);
      }
      if (result.metadata.creationDate) {
        console.log(`📅 Created: ${result.metadata.creationDate}`);
      }
      if (result.metadata.pageCount) {
        console.log(`📊 Pages: ${result.metadata.pageCount}`);
      }
      if (result.metadata.fileSize) {
        console.log(`💾 Size: ${(result.metadata.fileSize / 1024).toFixed(2)} KB`);
      }
    }

    console.log('');
    console.log('────────────────────────────────────────────────────────────────────');
    if (result.documentPath) {
      console.log(`📁 Output: ${result.documentPath}`);
    }
    console.log('────────────────────────────────────────────────────────────────────');
    console.log('');
  }
}

export default TUIPDFAgent;
