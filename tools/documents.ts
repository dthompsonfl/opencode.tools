/**
 * Document Generation Tool - Complete Corporate Document Generation
 * 
 * Supports:
 * - PDF: Professional PDF with charts, diagrams, tables
 * - DOCX: Word documents with tables, charts, images
 * - XLSX: Excel spreadsheets with multiple sheets, formulas, charts
 * - PPTX: PowerPoint presentations with slides, charts, diagrams
 * - CSV: Comma-separated values for data export
 * - MD: Markdown documents
 */
import * as fs from 'fs';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { Workbook } from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import { logger } from '../src/runtime/logger';
import { resolveRunContext } from '../src/runtime/run-context';

// ==================== TYPES ====================

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'md';

export interface DocumentSection {
    title: string;
    content: string | string[];
    level?: number;
}

export interface TableData {
    headers: string[];
    rows: string[][];
}

export interface ChartData {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'area';
    labels: string[];
    datasets: {
        name: string;
        values: number[];
    }[];
}

export interface DocumentConfig {
    title: string;
    subtitle?: string;
    author?: string;
    company?: string;
    date?: Date;
    format: DocumentFormat;
    sections: DocumentSection[];
    tables?: TableData[];
    charts?: ChartData[];
    outputPath: string;
}

// ==================== DOCX GENERATION ====================

/**
 * Generate a DOCX document
 */
export async function generateDOCX(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    const context = resolveRunContext();
    logger.info('Generating DOCX document', { title: config.title, format: config.format });

    try {
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(
            new Paragraph({
                text: config.title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // Subtitle
        if (config.subtitle) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: config.subtitle, italics: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );
        }

        // Author and date
        const metaText = [
            config.author ? `Author: ${config.author}` : '',
            config.company ? `Company: ${config.company}` : '',
            config.date ? `Date: ${config.date.toLocaleDateString()}` : ''
        ].filter(Boolean).join(' | ');

        if (metaText) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: metaText, color: '666666' })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 }
                })
            );
        }

        // Sections
        for (const section of config.sections) {
            // Section heading
            children.push(
                new Paragraph({
                    text: section.title,
                    heading: section.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Section content
            if (Array.isArray(section.content)) {
                for (const para of section.content) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun(para)],
                            spacing: { after: 200 }
                        })
                    );
                }
            } else {
                children.push(
                    new Paragraph({
                        children: [new TextRun(section.content)],
                        spacing: { after: 200 }
                    })
                );
            }
        }

        // Tables
        if (config.tables) {
            for (const table of config.tables) {
                const tableRows: TableRow[] = [
                    new TableRow({
                        children: table.headers.map(header => 
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({ text: header, bold: true })],
                                    alignment: AlignmentType.CENTER
                                })],
                                shading: { fill: 'E0E0E0' }
                            })
                        )
                    }),
                    ...table.rows.map(row =>
                        new TableRow({
                            children: row.map(cell => 
                                new TableCell({
                                    children: [new Paragraph(cell)]
                                })
                            )
                        })
                    )
                ];

                children.push(
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    })
                );
                children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
            }
        }

        const doc = new Document({
            sections: [{ children }]
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(config.outputPath, buffer);

        logger.info('DOCX document generated successfully', { 
            filePath: config.outputPath, 
            runId: context.runId 
        });

        return { filePath: config.outputPath, success: true };
    } catch (error) {
        logger.error('DOCX generation failed', { error: String(error) });
        throw error;
    }
}

// ==================== XLSX GENERATION ====================

/**
 * Generate an XLSX document
 */
export async function generateXLSX(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    const context = resolveRunContext();
    logger.info('Generating XLSX document', { title: config.title, format: config.format });

    try {
        const workbook = new Workbook();
        workbook.creator = config.author || 'OpenCode Tools';
        
        // Main content sheet
        if (config.tables && config.tables.length > 0) {
            // Create sheet for each table
            for (let i = 0; i < config.tables.length; i++) {
                const table = config.tables[i];
                const ws = workbook.addWorksheet(table.headers.join(', ') || `Sheet ${i + 1}`);
                
                // Headers
                const headerRow = ws.addRow(table.headers);
                headerRow.eachCell((cell: any) => {
                    cell.font = { bold: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E0E0E0' }
                    };
                    cell.alignment = { horizontal: 'center' };
                });

                // Data rows
                for (const row of table.rows) {
                    ws.addRow(row);
                }

                // Auto-fit columns
                ws.columns.forEach((column: any) => {
                    const maxLength = (column.values || [])
                        .filter((v: any) => v)
                        .map((v: any) => String(v).length)
                        .reduce((a: number, b: number) => Math.max(a, b), 10);
                    column.width = maxLength + 2;
                });
            }
        } else {
            const sheet = workbook.addWorksheet('Data');
            
            // Add title as first row
            sheet.addRow([config.title]);
            sheet.getCell('A1').font = { bold: true, size: 14 };
            sheet.addRow([]);

            // Add sections as rows
            for (const section of config.sections) {
                sheet.addRow([section.title]);
                sheet.getCell(`A${sheet.rowCount}`).font = { bold: true };
                if (Array.isArray(section.content)) {
                    for (const para of section.content) {
                        sheet.addRow(['', para]);
                    }
                } else {
                    sheet.addRow(['', section.content]);
                }
                sheet.addRow([]);
            }
        }

        // Charts sheet if chart data provided
        if (config.charts && config.charts.length > 0) {
            const chartSheet = workbook.addWorksheet('Charts');
            let chartRow = 1;
            
            for (const chart of config.charts) {
                chartSheet.getCell(`A${chartRow}`).value = chart.title;
                chartSheet.getCell(`A${chartRow}`).font = { bold: true, size: 14 };
                chartRow += 1;
                
                // Labels
                chartSheet.getCell(`A${chartRow}`).value = 'Category';
                for (let i = 0; i < chart.labels.length; i++) {
                    chartSheet.getCell(String.fromCharCode(66 + i) + chartRow).value = chart.labels[i];
                }
                chartRow++;

                // Datasets
                for (const dataset of chart.datasets) {
                    chartSheet.getCell(`A${chartRow}`).value = dataset.name;
                    for (let i = 0; i < dataset.values.length; i++) {
                        chartSheet.getCell(String.fromCharCode(66 + i) + chartRow).value = dataset.values[i];
                    }
                    chartRow++;
                }
                chartRow += 2;
            }
        }

        await workbook.xlsx.writeFile(config.outputPath);

        logger.info('XLSX document generated successfully', { 
            filePath: config.outputPath, 
            runId: context.runId 
        });

        return { filePath: config.outputPath, success: true };
    } catch (error) {
        logger.error('XLSX generation failed', { error: String(error) });
        throw error;
    }
}

// ==================== PPTX GENERATION ====================

/**
 * Generate a PPTX document
 */
export async function generatePPTX(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    const context = resolveRunContext();
    logger.info('Generating PPTX document', { title: config.title, format: config.format });

    try {
        const pres = new PptxGenJS();
        
        // Presentation metadata
        pres.author = config.author || 'OpenCode Tools';
        pres.company = config.company || '';
        pres.title = config.title;
        pres.subject = config.subtitle || '';

        // Title slide
        const titleSlide = pres.addSlide();
        titleSlide.addText(config.title, { 
            x: 1, y: 2, w: '90%', h: 1.5, 
            fontSize: 44, bold: true, color: '363636', align: 'center' 
        });
        if (config.subtitle) {
            titleSlide.addText(config.subtitle, { 
                x: 1, y: 3.5, w: '90%', h: 0.8, 
                fontSize: 24, color: '666666', align: 'center' 
            });
        }
        if (config.author || config.company) {
            const meta = [config.author, config.company].filter(Boolean).join(' - ');
            titleSlide.addText(meta, { 
                x: 1, y: 5, w: '90%', h: 0.5, 
                fontSize: 14, color: '999999', align: 'center' 
            });
        }

        // Content slides for each section
        for (const section of config.sections) {
            const slide = pres.addSlide();
            
            // Slide title
            slide.addText(section.title, { 
                x: 0.5, y: 0.5, w: '90%', h: 0.8, 
                fontSize: 32, bold: true, color: '363636' 
            });

            // Content
            let contentText = '';
            if (Array.isArray(section.content)) {
                contentText = section.content.join('\n\n');
            } else {
                contentText = section.content;
            }

            slide.addText(contentText, { 
                x: 0.5, y: 1.5, w: '90%', h: 4, 
                fontSize: 18, color: '363636', lineSpacing: 28 
            });
        }

        // Charts slide if chart data provided
        if (config.charts && config.charts.length > 0) {
            const chartSlide = pres.addSlide();
            chartSlide.addText('Charts & Data', { 
                x: 0.5, y: 0.5, w: '90%', h: 0.8, 
                fontSize: 32, bold: true, color: '363636' 
            });

            let chartY = 1.8;
            for (const chart of config.charts) {
                // Add chart data as table
                const rows = [
                    ['', ...chart.labels],
                    ...chart.datasets.map(d => [d.name, ...d.values.map(String)])
                ];
                
                chartSlide.addText(chart.title, { 
                    x: 0.5, y: chartY, w: '90%', h: 0.4, 
                    fontSize: 16, bold: true 
                });
                
                chartSlide.addTable(rows as any, { 
                    x: 0.5, y: chartY + 0.5, w: 5,
                    fontSize: 10,
                    color: '363636'
                });
                
                chartY += 2.5;
            }
        }

        // Tables slide if table data provided
        if (config.tables && config.tables.length > 0) {
            const tableSlide = pres.addSlide();
            tableSlide.addText('Data Tables', { 
                x: 0.5, y: 0.5, w: '90%', h: 0.8, 
                fontSize: 32, bold: true, color: '363636' 
            });

            let tableY = 1.8;
            for (const table of config.tables) {
                const rows = [table.headers, ...table.rows];
                tableSlide.addTable(rows as any[], { 
                    x: 0.5, y: tableY, w: 9,
                    fontSize: 10,
                    color: '363636',
                    border: { type: 'solid', pt: 1, color: 'CCCCCC' }
                });
                tableY += 3;
            }
        }

        await pres.writeFile({ fileName: config.outputPath });

        logger.info('PPTX document generated successfully', { 
            filePath: config.outputPath, 
            runId: context.runId 
        });

        return { filePath: config.outputPath, success: true };
    } catch (error) {
        logger.error('PPTX generation failed', { error: String(error) });
        throw error;
    }
}

// ==================== CSV GENERATION ====================

/**
 * Generate a CSV document
 */
export async function generateCSV(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    const context = resolveRunContext();
    logger.info('Generating CSV document', { title: config.title, format: config.format });

    try {
        const lines: string[] = [];

        // Add metadata as comments
        lines.push(`# ${config.title}`);
        if (config.subtitle) lines.push(`# ${config.subtitle}`);
        if (config.author) lines.push(`# Author: ${config.author}`);
        if (config.company) lines.push(`# Company: ${config.company}`);
        if (config.date) lines.push(`# Date: ${config.date.toLocaleDateString()}`);
        lines.push('');

        // Tables
        if (config.tables && config.tables.length > 0) {
            for (const table of config.tables) {
                // Table header
                lines.push(`# Table: ${table.headers.join(', ')}`);
                
                // CSV header
                lines.push(table.headers.map(escapeCSV).join(','));
                
                // Data rows
                for (const row of table.rows) {
                    lines.push(row.map(escapeCSV).join(','));
                }
                lines.push('');
            }
        } else {
            // Sections as content
            for (const section of config.sections) {
                lines.push(`# ${section.title}`);
                if (Array.isArray(section.content)) {
                    for (const para of section.content) {
                        lines.push(para);
                    }
                } else {
                    lines.push(section.content);
                }
                lines.push('');
            }
        }

        fs.writeFileSync(config.outputPath, lines.join('\n'), 'utf-8');

        logger.info('CSV document generated successfully', { 
            filePath: config.outputPath, 
            runId: context.runId 
        });

        return { filePath: config.outputPath, success: true };
    } catch (error) {
        logger.error('CSV generation failed', { error: String(error) });
        throw error;
    }
}

// ==================== MARKDOWN GENERATION ====================

/**
 * Generate a Markdown document
 */
export async function generateMarkdown(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    const context = resolveRunContext();
    logger.info('Generating Markdown document', { title: config.title, format: config.format });

    try {
        const lines: string[] = [];

        // Title
        lines.push(`# ${config.title}`);
        lines.push('');

        if (config.subtitle) {
            lines.push(`*${config.subtitle}*`);
            lines.push('');
        }

        // Metadata
        if (config.author || config.company || config.date) {
            lines.push('---');
            if (config.author) lines.push(`**Author:** ${config.author}`);
            if (config.company) lines.push(`**Company:** ${config.company}`);
            if (config.date) lines.push(`**Date:** ${config.date.toLocaleDateString()}`);
            lines.push('---');
            lines.push('');
        }

        // Sections
        for (const section of config.sections) {
            const headingLevel = section.level === 2 ? '##' : '#';
            lines.push(`${headingLevel} ${section.title}`);
            lines.push('');

            if (Array.isArray(section.content)) {
                for (const para of section.content) {
                    lines.push(para);
                    lines.push('');
                }
            } else {
                lines.push(section.content);
                lines.push('');
            }
        }

        // Tables
        if (config.tables) {
            lines.push('---');
            lines.push('');
            lines.push('## Tables');
            lines.push('');

            for (const table of config.tables) {
                // Header
                lines.push(`| ${table.headers.join(' | ')} |`);
                lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
                
                // Rows
                for (const row of table.rows) {
                    lines.push(`| ${row.join(' | ')} |`);
                }
                lines.push('');
            }
        }

        // Charts (as data tables)
        if (config.charts) {
            lines.push('---');
            lines.push('');
            lines.push('## Charts');
            lines.push('');

            for (const chart of config.charts) {
                lines.push(`### ${chart.title}`);
                lines.push('');
                
                // As markdown table
                const headerRow = `| ${['', ...chart.labels].join(' | ')} |`;
                const sepRow = `| ${['', ...chart.labels.map(() => '---')].join(' | ')} |`;
                
                lines.push(headerRow);
                lines.push(sepRow);

                for (const dataset of chart.datasets) {
                    const dataRow = `| ${dataset.name} | ${dataset.values.join(' | ')} |`;
                    lines.push(dataRow);
                }
                lines.push('');
            }
        }

        fs.writeFileSync(config.outputPath, lines.join('\n'), 'utf-8');

        logger.info('Markdown document generated successfully', { 
            filePath: config.outputPath, 
            runId: context.runId 
        });

        return { filePath: config.outputPath, success: true };
    } catch (error) {
        logger.error('Markdown generation failed', { error: String(error) });
        throw error;
    }
}

// ==================== MAIN GENERATOR ====================

/**
 * Main document generation function - routes to appropriate generator
 */
export async function generateDocument(config: DocumentConfig): Promise<{ filePath: string; success: boolean }> {
    logger.info('Document generation started', { title: config.title, format: config.format });

    switch (config.format) {
        case 'docx':
            return generateDOCX(config);
        case 'xlsx':
            return generateXLSX(config);
        case 'pptx':
            return generatePPTX(config);
        case 'csv':
            return generateCSV(config);
        case 'md':
            return generateMarkdown(config);
        case 'pdf':
            // PDF is handled by the PDF agent
            throw new Error('PDF generation is handled by the PDF agent. Use agents/pdf/pdf-agent.ts');
        default:
            throw new Error(`Unsupported document format: ${config.format}`);
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Quick generate from simple data
 */
export async function generateQuickDocument(
    title: string,
    content: string | string[][],
    format: DocumentFormat,
    outputPath: string,
    options?: {
        subtitle?: string;
        author?: string;
        company?: string;
    }
): Promise<{ filePath: string; success: boolean }> {
    const config: DocumentConfig = {
        title,
        subtitle: options?.subtitle,
        author: options?.author,
        company: options?.company,
        date: new Date(),
        format,
        outputPath,
        sections: Array.isArray(content) ? [] : [{ title: 'Content', content }],
        tables: Array.isArray(content) && content.length > 0 ? [{
            headers: content[0] || [],
            rows: content.slice(1) || []
        }] : undefined
    };

    return generateDocument(config);
}
