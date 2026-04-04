import { spawn } from 'child_process';

export interface PredictionResult {
  boxes: number[][];
  labels: string[];
  scores: number[];
}

/**
 * NemotronPageElementsAdapter
 * POC adapter that calls a Python CLI (assumed contract below) and parses JSON output.
 * Expected Python CLI contract:
 *   python -m nemotron_page_elements_v3.cli --infer --input <image> --json
 * The CLI should print a single JSON object to stdout: { boxes:[[x1,y1,x2,y2],...], labels:[...], scores:[...] }
 */
export class NemotronPageElementsAdapter {
  constructor(private pythonCmd: string = 'python', private module: string = 'nemotron_page_elements_v3.cli') {}

  public async infer(imagePath: string): Promise<PredictionResult> {
    return new Promise((resolve, reject) => {
      const args = ['-m', this.module, '--infer', '--input', imagePath, '--json'];
      const p = spawn(this.pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      p.stdout.on('data', (d) => (stdout += d.toString()));
      p.stderr.on('data', (d) => (stderr += d.toString()));
      p.on('close', (code) => {
        if (code !== 0) return reject(new Error(`python exited ${code}: ${stderr}`));
        try {
          const json = JSON.parse(stdout);
          resolve({ boxes: json.boxes || [], labels: json.labels || [], scores: json.scores || [] });
        } catch (err) {
          reject(new Error('invalid JSON from python CLI: ' + String(err)));
        }
      });
    });
  }
}
