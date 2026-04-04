/**
 * PDF Generation Tool
 * 
 * Provides PDF generation functionality for MCP server
 */

import { PDFGeneratorAgent } from '../agents/pdf/pdf-agent';
import type { PDFInput } from '../agents/pdf/types';
import * as fs from 'fs';
import * as path from 'path';

export interface PdfGenerateInput {
  input: PDFInput;
  outputPath?: string;
}

export interface PdfGenerateResult {
  success: boolean;
  documentPath?: string;
  pageCount?: number;
  metadata?: any;
  error?: string;
}

/**
 * Generate PDF document from input configuration
 */
export async function pdfGenerate(input: PdfGenerateInput): Promise<PdfGenerateResult> {
  try {
    const { input: pdfInput, outputPath = './output/document.pdf' } = input;
    
    if (!pdfInput) {
      throw new Error('PDF input is required');
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create PDF generator agent
    const agent = new PDFGeneratorAgent();
    
    // Generate PDF
    const result = await agent.execute(pdfInput);
    
    // Write PDF to file
    const buffer = result.documentBuffer;
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF generation returned empty buffer');
    }
    
    // Validate PDF header
    const header = buffer.subarray(0, 5).toString('utf-8');
    if (header !== '%PDF-') {
      throw new Error('Generated document is not a valid PDF');
    }
    
    fs.writeFileSync(outputPath, buffer);
    
    // Write metadata if available
    if (result.metadata) {
      const metadataPath = outputPath.replace(/\.pdf$/i, '.metadata.json');
      fs.writeFileSync(
        metadataPath,
        JSON.stringify(result.metadata, null, 2),
        'utf-8'
      );
    }
    
    return {
      success: true,
      documentPath: outputPath,
      pageCount: result.metadata?.pageCount || 0,
      metadata: result.metadata
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}