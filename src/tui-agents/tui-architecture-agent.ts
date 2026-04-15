import { ArchitectureAgent } from '../../agents/architecture';
import { logger } from '../runtime/logger';
import * as fs from 'fs';
import * as path from 'path';

export class TUIArchitectureAgent {
  private agent: ArchitectureAgent;
  private readonly artifactsDir = 'artifacts/architecture';

  constructor() {
    this.agent = new ArchitectureAgent();
  }

  async runInteractive(): Promise<void> {
    console.log('\n📐 OpenCode Architecture Agent');
    console.log('============================');

    try {
      const prdPath = await this.tuiPrompt('Path to PRD (markdown):');
      if (!fs.existsSync(prdPath)) {
          throw new Error(`File not found: ${prdPath}`);
      }
      
      const prdContent = fs.readFileSync(prdPath, 'utf-8');
      
      console.log('\n🚀 Designing system architecture...');
      const result = await this.agent.execute({ prd_content: prdContent });
      
      const outputPath = await this.saveResults(result, path.basename(prdPath, '.md'));
      
      console.log('\n✅ Architecture design completed!');
      console.log(`📁 Results saved to: ${outputPath}`);
      console.log('\n📊 Summary:');
      console.log(`   • Epics identified: ${result.backlog.epics.length}`);
      console.log(`   • Diagram generated: Yes (Mermaid)`);

    } catch (error: any) {
      console.error('❌ Architecture design failed:', error.message);
      throw error;
    }
  }

  private async tuiPrompt(message: string): Promise<string> {
    const readline = await import('readline');
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(message + ' ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private async saveResults(result: any, baseName: string): Promise<string> {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(this.artifactsDir, `${baseName}-architecture-${timestamp}`);
    
    fs.writeFileSync(`${outPath}-diagram.mmd`, result.architectureDiagram);
    fs.writeFileSync(`${outPath}-backlog.json`, JSON.stringify(result.backlog, null, 2));
    
    return outPath;
  }
}
