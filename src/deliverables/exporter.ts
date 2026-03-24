import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { ArtifactManager } from '../runtime/artifacts';

export class Exporter {
  private artifactManager: ArtifactManager;

  constructor(artifactManager: ArtifactManager) {
    this.artifactManager = artifactManager;
  }

  async createBundle(runId: string, outputDir: string): Promise<string> {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const zipPath = path.join(outputDir, `run-${runId}-bundle.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(zipPath));
      archive.on('error', (err: any) => reject(err));

      archive.pipe(output);
      resolve(zipPath);
    });
  }
  
  async zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(outPath);

    return new Promise((resolve, reject) => {
      archive
        .directory(sourceDir, false)
        .on('error', (err: any) => reject(err))
        .pipe(stream);

      stream.on('close', () => resolve());
      archive.finalize();
    });
  }
}
