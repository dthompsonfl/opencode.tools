import { GitLeaksScanner } from '../../foundry/foundry/security/scanners';

export class GitleaksScanner {
  scan(target: string, rules: string[]): Promise<any> {
    const scanner = new GitLeaksScanner();
    return scanner.scan({ target });
  }
}