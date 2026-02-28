import { spawn } from 'child_process';
import type { FoundryQualityGateResult } from './contracts';

export interface GateCommand {
  name: string;
  command: string;
  args: string[];
  optional?: boolean;
}

export class QualityGateRunner {
  private readonly defaultCommands: GateCommand[] = [
    { name: 'lint', command: 'npm', args: ['run', 'lint'] },
    { name: 'build', command: 'npm', args: ['run', 'build'] },
    { name: 'typecheck', command: 'npx', args: ['tsc', '--noEmit'] },
    { name: 'tests', command: 'npm', args: ['run', 'test:all'] },
    { name: 'security', command: 'npm', args: ['run', 'test:security'], optional: true },
    {
      name: 'documentation',
      command: 'node',
      args: ['-e', "const fs=require('fs');const required=['README.md','AGENTS.md','docs/PRODUCTION_DELIVERABLE_POLICY.md'];const missing=required.filter((file)=>!fs.existsSync(file));if(missing.length){console.error('Missing docs: '+missing.join(', '));process.exit(1);}console.log('Documentation baseline present');"],
      optional: true,
    },
    { name: 'deliverable_scope', command: 'node', args: ['scripts/validate-deliverable-scope.js'] },
  ];

  public async runAll(
    cwd: string,
    commands: GateCommand[] = this.defaultCommands,
  ): Promise<FoundryQualityGateResult[]> {
    const results: FoundryQualityGateResult[] = [];

    for (const gate of commands) {
      results.push(await this.runGate(gate, cwd));
    }

    return results;
  }

  private runGate(gate: GateCommand, cwd: string): Promise<FoundryQualityGateResult> {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const useShell = isWindows && (gate.command === 'npm' || gate.command === 'npx');

      const child = spawn(gate.command, gate.args, {
        cwd,
        shell: useShell,
      });

      let stdout = '';
      let stderr = '';
      const MAX_OUTPUT_SIZE = 1024 * 1024 * 20;

      child.stdout.on('data', (data) => {
        if (stdout.length < MAX_OUTPUT_SIZE) {
          stdout += data.toString();
        }
      });

      child.stderr.on('data', (data) => {
        if (stderr.length < MAX_OUTPUT_SIZE) {
          stderr += data.toString();
        }
      });

      const handleCompletion = (code: number | null, error?: Error) => {
        const fullCommand = `${gate.command} ${gate.args.join(' ')}`;

        if (error) {
          const execError = error as NodeJS.ErrnoException;

          if (gate.optional && this.isCommandUnavailable({ ...execError, stderr })) {
            return resolve({
              name: gate.name,
              command: fullCommand,
              passed: true,
              exitCode: 0,
              output: [
                `Optional gate skipped because command is unavailable: ${fullCommand}`,
                execError.message,
              ].filter(Boolean).join('\n').trim(),
            });
          }

          const exitCode = typeof execError.code === 'number' ? execError.code : 1;
          return resolve({
            name: gate.name,
            command: fullCommand,
            passed: false,
            exitCode,
            output: [stdout, stderr, execError.message].filter(Boolean).join('\n').trim(),
          });
        }

        const finalCode = code ?? 1;
        resolve({
          name: gate.name,
          command: fullCommand,
          passed: finalCode === 0,
          exitCode: finalCode,
          output: [stdout, stderr].filter(Boolean).join('\n').trim(),
        });
      };

      child.on('error', (err) => handleCompletion(null, err));
      child.on('close', (code) => handleCompletion(code));
    });
  }

  private isCommandUnavailable(error: NodeJS.ErrnoException & { stderr?: string }): boolean {
    const message = `${error.message ?? ''} ${error.stderr ?? ''}`.toLowerCase();
    return (
      message.includes('is not recognized as an internal or external command') ||
      message.includes('not found') ||
      message.includes('enoent')
    );
  }
}
