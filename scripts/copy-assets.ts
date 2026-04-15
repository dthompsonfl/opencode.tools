/**
 * Copy Assets Script
 * 
 * Copies plugin markdown files from src/ to dist/assets/ for packaging.
 * This ensures plugin assets are available in npm packages.
 * 
 * Run after TypeScript compilation: node dist/scripts/copy-assets.js
 */

import * as fs from 'fs';
import * as path from 'path';

// Paths - resolve from dist/scripts/ to project root
const projectRoot = path.resolve(__dirname, '..', '..');
const srcPluginsDir = path.join(projectRoot, 'src', 'cowork', 'plugins');
const distAssetsDir = path.join(projectRoot, 'dist', 'assets', 'cowork', 'plugins');

interface Dirent {
  isDirectory: () => boolean;
  name: string;
}

function copyDirectory(src: string, dest: string): void {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true }) as Dirent[];

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main(): void {
  console.log('Copying plugin assets...');
  console.log(`  Source: ${srcPluginsDir}`);
  console.log(`  Destination: ${distAssetsDir}`);

  if (!fs.existsSync(srcPluginsDir)) {
    console.warn('Source plugins directory does not exist, skipping asset copy.');
    return;
  }

  try {
    // Ensure destination parent directory exists
    const destParent = path.dirname(distAssetsDir);
    if (!fs.existsSync(destParent)) {
      fs.mkdirSync(destParent, { recursive: true });
    }

    // Copy each plugin directory
    const pluginDirs = fs.readdirSync(srcPluginsDir, { withFileTypes: true }) as Dirent[];
    let copiedCount = 0;

    for (const entry of pluginDirs) {
      if (entry.isDirectory()) {
        const srcPath = path.join(srcPluginsDir, entry.name);
        const destPath = path.join(distAssetsDir, entry.name);
        copyDirectory(srcPath, destPath);
        copiedCount++;
        console.log(`  Copied plugin: ${entry.name}`);
      }
    }

    console.log(`\n✅ Successfully copied ${copiedCount} plugin(s) to dist/assets/`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error copying assets:', errMsg);
    process.exit(1);
  }
}

main();
