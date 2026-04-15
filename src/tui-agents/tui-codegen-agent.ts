import { CodeGenAgent } from '../../agents/codegen';
import { logger } from '../runtime/logger';
import * as fs from 'fs';
import * as path from 'path';

export class TUICodeGenAgent {
  private agent: CodeGenAgent;

  constructor() {
    this.agent = new CodeGenAgent();
  }

  async runInteractive(): Promise<void> {
    console.log('\n💻 OpenCode CodeGen Agent');
    console.log('============================');

    try {
      const title = await this.tuiPrompt('Feature Title:');
      const techStack = await this.tuiPrompt('Tech Stack (e.g. Node.js/TypeScript):');
      
      console.log(`\n🚀 Scaffolding ${title}...`);
      const result = await this.agent.execute({
          id: 'TUI-RUN',
          title,
          description: `Generated via OpenCode TUI`,
          techStack
      });
      
      console.log('\n✅ Scaffolding completed!');
      console.log(`📝 Log:\n${result.log}`);
      console.log(`📁 Files created: ${result.filesCreated.join(', ')}`);

    } catch (error: any) {
      console.error('❌ CodeGen failed:', error.message);
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
}
