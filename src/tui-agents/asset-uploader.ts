import * as readline from 'readline';
import { AssetReference, AssetType, AssetConfig } from '@/types/pdf';
import { displaySection, selectOption } from './tui-utils';

export const assetTypes: { id: AssetType; label: string; description: string }[] = [
  { id: 'image', label: 'Image', description: 'General image (JPEG, PNG, GIF, etc.)' },
  { id: 'logo', label: 'Logo', description: 'Company or brand logo' },
  { id: 'font', label: 'Custom Font', description: 'Custom font file (TTF, OTF)' },
  { id: 'watermark', label: 'Watermark', description: 'Watermark image or text' },
  { id: 'signature', label: 'Signature', description: 'Digital signature' },
  { id: 'background', label: 'Background', description: 'Page background image' },
  { id: 'header', label: 'Header Image', description: 'Custom header' },
  { id: 'footer', label: 'Footer Image', description: 'Custom footer' }
];

export class AssetUploader {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<AssetReference[]> {
    try {
      displaySection('Asset Management');

      const assets: AssetReference[] = [];
      let continueAdding = true;

      while (continueAdding) {
        const asset = await this.uploadAsset();
        if (asset) {
          assets.push(asset);
        }

        if (assets.length > 0) {
          console.log('\nCurrent Assets:');
          assets.forEach((a, idx) => {
            console.log(`  ${idx + 1}. ${a.type} - ${a.path}`);
          });
        }

        continueAdding = await this.confirm('\nAdd another asset');
      }

      return assets;
    } finally {
      this.rl.close();
    }
  }

  async uploadAsset(): Promise<AssetReference | null> {
    const type = await this.selectAssetType();
    const source = await this.enterAssetSource();

    const id = `asset-${Date.now()}`;
    const alt = await this.askQuestion('Enter alt text (optional): ');
    const caption = await this.askQuestion('Enter caption (optional): ');
    const position = await this.selectPosition();

    return {
      id,
      type,
      path: source,
      alt: alt || undefined,
      caption: caption || undefined,
      position: position as 'inline' | 'float-left' | 'float-right' | 'full-page'
    };
  }

  async uploadImage(): Promise<AssetReference> {
    const type: AssetType = 'image';
    const source = await this.enterAssetSource();

    return {
      id: `asset-${Date.now()}`,
      type,
      path: source
    };
  }

  async uploadLogo(): Promise<AssetReference> {
    const type: AssetType = 'logo';
    const source = await this.enterAssetSource();

    console.log('Enter logo placement options:');

    return {
      id: `asset-${Date.now()}`,
      type,
      path: source,
      position: 'inline'
    };
  }

  async uploadFont(): Promise<AssetReference> {
    const type: AssetType = 'font';
    const source = await this.enterAssetSource();

    return {
      id: `asset-${Date.now()}`,
      type,
      path: source
    };
  }

  async uploadWatermark(): Promise<AssetReference> {
    const type: AssetType = 'watermark';
    const source = await this.enterAssetSource();

    console.log('Watermark settings:');
    const opacity = await this.askQuestion('Enter opacity (0.1-1.0, default 0.3): ');

    return {
      id: `asset-${Date.now()}`,
      type,
      path: source,
      width: parseFloat(opacity) || 0.3
    };
  }

  private async selectAssetType(): Promise<AssetType> {
    return await selectOption('Select asset type:', assetTypes);
  }

  private async enterAssetSource(): Promise<string> {
    const useFile = await this.confirm('Enter file path');

    if (useFile) {
      const path = await this.askQuestion('Enter file path: ');
      return path;
    }

    const url = await this.askQuestion('Enter URL: ');
    return url;
  }

  private async configureAsset(asset: AssetConfig): Promise<AssetConfig> {
    displaySection('Asset Configuration');

    const width = await this.askQuestion('Enter width (pixels, optional): ');
    const height = await this.askQuestion('Enter height (pixels, optional): ');
    const preserveAspect = await this.confirm('Preserve aspect ratio');

    return {
      ...asset,
      options: {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        preserveAspectRatio: preserveAspect
      }
    };
  }

  private async previewAsset(asset: AssetReference): Promise<void> {
    displaySection('Asset Preview');

    console.log(`Type: ${asset.type}`);
    console.log(`Path: ${asset.path}`);
    if (asset.alt) {
      console.log(`Alt: ${asset.alt}`);
    }
    if (asset.caption) {
      console.log(`Caption: ${asset.caption}`);
    }
    if (asset.position) {
      console.log(`Position: ${asset.position}`);
    }
    console.log('');

    const useAsset = await this.confirm('Use this asset');
    if (!useAsset) {
      await this.uploadAsset();
    }
  }

  private async selectPosition(): Promise<'inline' | 'float-left' | 'float-right' | 'full-page'> {
    const positionOptions: { id: 'inline' | 'float-left' | 'float-right' | 'full-page'; label: string; description: string }[] = [
      { id: 'inline', label: 'Inline', description: 'Place within text flow' },
      { id: 'float-left', label: 'Float Left', description: 'Float to left with text wrapping' },
      { id: 'float-right', label: 'Float Right', description: 'Float to right with text wrapping' },
      { id: 'full-page', label: 'Full Page', description: 'Span full page width' }
    ];

    return await selectOption<'inline' | 'float-left' | 'float-right' | 'full-page'>('Select position:', positionOptions);
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  private confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
      this.rl.question(`${question} (y/n): `, answer => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }
}

export default AssetUploader;
