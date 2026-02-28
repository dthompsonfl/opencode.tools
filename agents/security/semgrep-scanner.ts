import { SemgrepScanner as RealSemgrepScanner } from '../../foundry/foundry/security/scanners';

export class SemgrepScanner {
  scan(target: string, rules: string[]): Promise<any> {
    const scanner = new RealSemgrepScanner();
    return scanner.scan({ target });
  }
}