import { PDFInput, PDFSection, ChartConfig, DiagramConfig, AssetReference, PDFSecurity, TOCEntry, BookmarkEntry, PDFMetadata } from '../../agents/pdf/types';
import { v4 as uuidv4 } from 'uuid';

export const createValidPDFInput = (overrides?: Partial<PDFInput>): PDFInput => ({
  title: 'Test Document',
  subtitle: 'A test PDF document',
  authors: ['Test Author'],
  organization: 'Test Organization',
  version: '1.0',
  template: 'standard',
  sections: [
    {
      id: 'section-1',
      title: 'Introduction',
      level: '1',
      content: 'This is the introduction section with some content.',
    },
    {
      id: 'section-2',
      title: 'Main Content',
      level: '1',
      content: 'This is the main content section.',
    },
  ],
  styling: {
    primaryColor: '#1a365d',
    fontFamily: 'Arial',
    fontSize: 12,
    lineHeight: 1.5,
  },
  output: {
    format: 'pdf',
    compress: true,
    imageQuality: 90,
    embedFonts: true,
    generateTOC: true,
    generateBookmarks: true,
  },
  ...overrides,
});

export const createPDFInputWithSections = (sectionCount: number = 10): PDFInput => {
  const sections: PDFSection[] = [];
  for (let i = 1; i <= sectionCount; i++) {
    sections.push({
      id: `section-${i}`,
      title: `Section ${i}`,
      level: (i <= 4 ? String(i) : '1') as '1' | '2' | '3' | '4',
      content: `Content for section ${i}. This is some sample text that will be rendered in the PDF document.`,
    });
  }
  return createValidPDFInput({ sections });
};

export const createPDFInputWithCover = (): PDFInput => {
  return createValidPDFInput({
    title: 'Whitepaper Title',
    subtitle: 'A comprehensive study',
    authors: ['Author One', 'Author Two'],
    organization: 'Research Institute',
    version: '2.0',
    date: new Date('2024-01-15'),
  });
};

export const createPDFInputWithCharts = (): PDFInput => {
  return createValidPDFInput({
    charts: [
      {
        id: uuidv4(),
        type: 'bar',
        title: 'Revenue Chart',
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [
            {
              label: 'Revenue',
              data: [100, 200, 150, 300],
            },
          ],
        },
      },
      {
        id: uuidv4(),
        type: 'line',
        title: 'Growth Trend',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [
            {
              label: 'Users',
              data: [50, 100, 150, 200, 250],
            },
          ],
        },
      },
    ],
  });
};

export const createPDFInputWithDiagrams = (): PDFInput => {
  return createValidPDFInput({
    diagrams: [
      {
        id: uuidv4(),
        type: 'flowchart',
        title: 'Process Flow',
        definition: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]',
      },
      {
        id: uuidv4(),
        type: 'sequence',
        title: 'System Sequence',
        definition: 'sequenceDiagram\n  User->>System: Request\n  System->>Database: Query\n  Database-->>System: Response',
      },
    ],
  });
};

export const createPDFInputWithSecurity = (): PDFInput => {
  return createValidPDFInput({
    security: {
      encrypt: true,
      userPassword: 'UserP@ss123!',
      ownerPassword: 'OwnerP@ss456!',
      encryptionLevel: '256',
      permissions: {
        print: 'high',
        copy: true,
        modify: true,
        annotate: true,
        formFields: true,
        contentAccessibility: true,
        documentAssembly: true,
      },
    },
  });
};

export const createInvalidPDFInput = (): PDFInput => ({
  title: '',
  authors: [],
  template: 'invalid-template',
  sections: [],
} as unknown as PDFInput);

export const createPDFInputWithAssets = (): PDFInput => {
  return createValidPDFInput({
    assets: [
      {
        id: uuidv4(),
        type: 'image',
        source: 'https://example.com/logo.png',
        altText: 'Company Logo',
        width: 200,
        height: 100,
        quality: 90,
      },
    ],
  });
};

export const createPDFInputWithCustomFont = (): PDFInput => {
  return createValidPDFInput({
    styling: {
      fontFamily: 'CustomFont',
      primaryColor: '#2563EB',
    },
  });
};

export const createCompletePDFInput = (): PDFInput => {
  return createValidPDFInput({
    title: 'Comprehensive Technical Whitepaper',
    subtitle: 'A Deep Dive into Modern Technology',
    authors: ['Dr. Jane Smith', 'John Doe'],
    organization: 'Tech Research Labs',
    version: '3.0',
    date: new Date('2024-06-01'),
    charts: [
      {
        id: uuidv4(),
        type: 'bar',
        title: 'Market Analysis',
        data: {
          labels: ['2020', '2021', '2022', '2023'],
          datasets: [
            {
              label: 'Market Size (B)',
              data: [100, 150, 200, 280],
            },
          ],
        },
      },
      {
        id: uuidv4(),
        type: 'pie',
        title: 'Distribution',
        data: {
          labels: ['Category A', 'Category B', 'Category C'],
          datasets: [
            {
              label: 'Distribution',
              data: [30, 50, 20],
            },
          ],
        },
      },
    ],
    diagrams: [
      {
        id: uuidv4(),
        type: 'flowchart',
        title: 'Architecture Overview',
        definition: 'graph TB\n  Client-->LoadBalancer\n  LoadBalancer-->API\n  API-->Database',
      },
    ],
    assets: [
      {
        id: uuidv4(),
        type: 'image',
        source: 'https://example.com/company-logo.png',
        altText: 'Company Logo',
      },
    ],
  });
};

export const createLargePDFInput = (sectionCount: number = 50): PDFInput => {
  const sections: PDFSection[] = [];
  for (let i = 1; i <= sectionCount; i++) {
    sections.push({
      id: `section-${i}`,
      title: `Chapter ${Math.ceil(i / 5)}: Section ${i}`,
      level: i % 5 === 1 ? '1' : i % 5 === 2 ? '2' : '3',
      content: `This is the content for section ${i}. `.repeat(50),
    });
  }
  return createValidPDFInput({ sections });
};

export const createMockPDFDocument = () => ({
  page: { width: 612, height: 792 },
  font: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  rect: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  addPage: jest.fn().mockReturnThis(),
  bufferedPageRange: jest.fn().mockReturnValue({ count: 5 }),
  switchToPage: jest.fn().mockReturnThis(),
  registerFont: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue(Buffer.from([])),
  on: jest.fn().mockReturnThis(),
  openImage: jest.fn().mockReturnValue({
    width: 400,
    height: 300,
  }),
  catalog: {
    obj: {},
  },
  x: 50,
  y: 700,
});

export const createMockCanvas = () => ({
  canvas: { width: 800, height: 600 },
  fillRect: jest.fn(),
  fillText: jest.fn(),
  beginPath: jest.fn(),
  rect: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  bezierCurveTo: jest.fn(),
});

export const createMockSharp = () => ({
  resize: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from([0x89, 0x50, 0x4E, 0x47])),
  metadata: jest.fn().mockResolvedValue({
    width: 800,
    height: 600,
    format: 'png',
    hasAlpha: false,
  }),
});

export const createMockPdfLib = () => ({
  PDFDocument: {
    load: jest.fn().mockResolvedValue({
      getPageCount: jest.fn().mockReturnValue(10),
      save: jest.fn().mockResolvedValue(Buffer.from([])),
    }),
  },
});

export const createMockPDFBuffer = (): Buffer => {
  return Buffer.from('PDF mock content %PDF-1.4 mock document');
};

export const createSecurityConfigWithPasswords = (): PDFSecurity => ({
  encrypt: true,
  userPassword: 'TestUser123!',
  ownerPassword: 'TestOwner456!',
  encryptionLevel: '256',
});

export const createSecurityConfigWithPermissions = (): PDFSecurity => ({
  encrypt: true,
  userPassword: 'TestUser123!',
  ownerPassword: 'TestOwner456!',
  permissions: {
    print: 'high',
    copy: true,
    modify: true,
    annotate: true,
    formFields: true,
    contentAccessibility: true,
    documentAssembly: true,
  },
  encryptionLevel: '256',
});

export const createSecurityConfigWithAES256 = (): PDFSecurity => ({
  encrypt: true,
  userPassword: 'TestUser123!',
  ownerPassword: 'TestOwner456!',
  encryptionLevel: '256',
});

export const createBarChartConfig = (): ChartConfig => ({
  id: uuidv4(),
  type: 'bar',
  title: 'Bar Chart',
  data: {
    labels: ['A', 'B', 'C', 'D'],
    datasets: [
      {
        label: 'Values',
        data: [10, 20, 30, 40],
      },
    ],
  },
});

export const createLineChartConfig = (): ChartConfig => ({
  id: uuidv4(),
  type: 'line',
  title: 'Line Chart',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Trend',
        data: [5, 10, 15, 25],
        tension: 0.4,
      },
    ],
  },
});

export const createPieChartConfig = (): ChartConfig => ({
  id: uuidv4(),
  type: 'pie',
  title: 'Pie Chart',
  data: {
    labels: ['Part A', 'Part B', 'Part C'],
    datasets: [
      {
        label: 'Share',
        data: [30, 50, 20],
      },
    ],
  },
});

export const createFlowchartConfig = (): DiagramConfig => ({
  id: uuidv4(),
  type: 'flowchart',
  title: 'Flowchart',
  definition: 'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]',
});

export const createSequenceDiagramConfig = (): DiagramConfig => ({
  id: uuidv4(),
  type: 'sequence',
  title: 'Sequence',
  definition: 'sequenceDiagram\n  User->>System: Hello',
});

export const createGanttChartConfig = (): DiagramConfig => ({
  id: uuidv4(),
  type: 'gantt',
  title: 'Timeline',
  definition: 'gantt\n  title Project Timeline\n  Task 1: 2024-01-01, 30d\n  Task 2: 2024-02-01, 45d',
});

export const createImageAssetConfig = (): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/image.png',
  altText: 'Sample Image',
  width: 400,
  height: 300,
  quality: 90,
});

export const createImageAssetConfigWithDimensions = (width: number, height: number): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/image.png',
  width,
  height,
});

export const createImageAssetConfigWithFormat = (format: string): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/image.png',
  width: 400,
  height: 300,
  quality: 90,
});

export const createLogoAssetConfig = (): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/logo.png',
  altText: 'Company Logo',
  preserveAspectRatio: true,
});

export const createInvalidImageAssetConfig = (): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/invalid.png',
});

export const createMissingImageAssetConfig = (): AssetReference => ({
  id: uuidv4(),
  type: 'image',
  source: 'https://example.com/missing.png',
});

export const createMockImageBuffer = (): Buffer => {
  return Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
};

export const createMockLayoutPlan = () => ({
  pageCount: 3,
  pageWidth: 612,
  pageHeight: 792,
  contentWidth: 468,
  contentHeight: 648,
  margins: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  tocStartPage: 2,
  sectionStartPage: 3,
  pageNumbers: {
    startPage: 1,
    format: '1' as const,
    position: 'bottom-center' as const,
  },
});

export const createMultiPageLayoutPlan = () => ({
  ...createMockLayoutPlan(),
  pageCount: 10,
});

export const createLayoutPlanWithTOC = () => ({
  ...createMockLayoutPlan(),
  tocStartPage: 2,
});

export const generateColorPalette = (count: number): string[] => {
  const colors = [
    '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED',
    '#0891B2', '#BE185D', '#4F46E5', '#0D9488', '#EA580C',
    '#1E40AF', '#047857', '#B45309', '#B91C1C', '#6D28D9',
  ];
  return colors.slice(0, count);
};

export const generateAccessiblePalette = (count: number): string[] => {
  const accessibleColors = [
    '#0077BB', '#33BBEE', '#009988', '#EE7733', '#CC3311',
    '#EE3377', '#BBBBBB', '#332288', '#88CCEE', '#44AA99',
  ];
  return accessibleColors.slice(0, count);
};

export const createMockDatabase = () => ({
  query: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({ id: 'test-id' }),
  update: jest.fn().mockResolvedValue({ affectedRows: 1 }),
  delete: jest.fn().mockResolvedValue({ affectedRows: 1 }),
});

export const createMockAuditService = () => ({
  logEvent: jest.fn().mockResolvedValue(undefined),
});

export const createBatchPDFInputs = (count: number): PDFInput[] => {
  return Array.from({ length: count }, (_, i) =>
    createValidPDFInput({
      title: `Document ${i + 1}`,
      sections: [
        {
          id: `section-${i}`,
          title: `Section ${i + 1}`,
          level: '1',
          content: `Content for document ${i + 1}`,
        },
      ],
    })
  );
};

export const createChartConfigWithDimensions = (width: number, height: number): ChartConfig => ({
  id: uuidv4(),
  type: 'bar',
  title: 'Sized Chart',
  data: {
    labels: ['A', 'B'],
    datasets: [
      {
        label: 'Data',
        data: [10, 20],
      },
    ],
  },
  width,
  height,
});

export const convertToWhitepaperInput = (researchResult: any): PDFInput => {
  return createValidPDFInput({
    title: `${researchResult.dossier?.companySummary?.substring(0, 50) || 'Company'} Whitepaper`,
    subtitle: 'A Comprehensive Research Report',
    sections: [
      {
        id: 'executive-summary',
        title: 'Executive Summary',
        level: '1',
        content: researchResult.dossier?.companySummary || 'Summary not available',
      },
      {
        id: 'industry-overview',
        title: 'Industry Overview',
        level: '1',
        content: researchResult.dossier?.industryOverview || 'Industry information not available',
      },
    ],
  });
};

export const loadTemplate = (templateId: string): any => ({
  id: templateId,
  name: templateId,
  sections: ['header', 'content', 'footer'],
});

export const loadClientData = (clientId: string): any => ({
  id: clientId,
  name: 'Client Corporation',
  project: 'Website Redesign',
  date: new Date().toISOString(),
});

export const mergeTemplateAndData = (template: any, data: any): PDFInput => {
  return createValidPDFInput({
    title: `${data.name} - ${data.project}`,
    organization: data.name,
    sections: [
      {
        id: 'project-overview',
        title: 'Project Overview',
        level: '1',
        content: `This document outlines the ${data.project} for ${data.name}.`,
      },
    ],
  });
};
