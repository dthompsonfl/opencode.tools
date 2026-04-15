import {
  ChartConfig,
  ChartType,
  ChartConfigSchema,
  ChartStyle
} from '../../agents/pdf/graphics/chart-config';
import {
  defaultColorPalette,
  professionalPalette,
  generateColorPalette,
  generateGradientColors,
  hexToRgb,
  rgbToHex,
  adjustBrightness,
  getContrastColor,
  generateChartColors,
  formatLabel,
  calculateChartDimensions,
  validateDataPoints,
  sanitizeChartTitle
} from '../../agents/pdf/charts/chart-helpers';
import {
  createBarChartConfig,
  createHorizontalBarChartConfig,
  createStackedBarChartConfig,
  createGroupedBarChartConfig,
  validateBarChartData
} from '../../agents/pdf/charts/bar-chart';
import {
  createLineChartConfig,
  createAreaChartConfig,
  createSteppedLineChartConfig,
  validateLineChartData
} from '../../agents/pdf/charts/line-chart';
import {
  createPieChartConfig,
  createDoughnutChartConfig,
  createPolarAreaChartConfig,
  validatePieChartData
} from '../../agents/pdf/charts/pie-chart';

describe('ChartConfig Types', () => {
  it('should validate a basic chart configuration', () => {
    const config: ChartConfig = {
      id: 'test-chart',
      type: 'bar',
      title: 'Test Chart',
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Dataset 1',
          data: [10, 20, 30]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false
      },
      width: 800,
      height: 400,
      style: {
        backgroundColor: '#ffffff'
      }
    };

    const result = ChartConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate different chart types', () => {
    const chartTypes: ChartType[] = [
      'bar', 'horizontalBar', 'line', 'pie', 'doughnut',
      'radar', 'polarArea', 'bubble', 'scatter'
    ];

    chartTypes.forEach(type => {
      const config: ChartConfig = {
        id: `test-${type}`,
        type,
        title: `Test ${type} chart`,
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{
            label: 'Data',
            data: [10, 20, 30]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: false
        }
      };

      const result = ChartConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid chart configuration', () => {
    const invalidConfig = {
      id: '',
      type: 'invalid-type',
      title: '',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false
      }
    };

    const result = ChartConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});

describe('Chart Helpers - Color Palette', () => {
  it('should export default color palette', () => {
    expect(defaultColorPalette).toBeInstanceOf(Array);
    expect(defaultColorPalette.length).toBeGreaterThan(0);
    expect(defaultColorPalette[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('should export professional color palettes', () => {
    expect(professionalPalette.blues).toBeInstanceOf(Array);
    expect(professionalPalette.grays).toBeInstanceOf(Array);
    expect(professionalPalette.categorical).toBeInstanceOf(Array);
    expect(professionalPalette.monochrome).toBeInstanceOf(Array);
  });

  it('should generate color palette of correct length', () => {
    expect(generateColorPalette(5)).toHaveLength(5);
    expect(generateColorPalette(10)).toHaveLength(10);
    expect(generateColorPalette(15)).toHaveLength(15);
  });

  it('should generate gradient colors', () => {
    const colors = generateGradientColors(5, '#1a365d', '#90cdf4');
    expect(colors).toHaveLength(5);
    colors.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('should handle hex to rgb conversion', () => {
    const rgb = hexToRgb('#1a365d');
    expect(rgb).toEqual({ r: 26, g: 54, b: 93 });
  });

  it('should return null for invalid hex colors', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#gggggg')).toBeNull();
  });

  it('should convert rgb to hex', () => {
    expect(rgbToHex(26, 54, 97)).toBe('#1a3661');
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('should adjust brightness', () => {
    const lighter = adjustBrightness('#808080', 20);
    const darker = adjustBrightness('#808080', -20);
    expect(lighter).not.toBe(darker);
  });

  it('should get contrast color', () => {
    expect(getContrastColor('#ffffff')).toBe('#000000');
    expect(getContrastColor('#000000')).toBe('#ffffff');
  });

  it('should generate chart colors', () => {
    const colors = generateChartColors(5);
    expect(colors).toHaveLength(5);
    colors.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Chart Helpers - Utility Functions', () => {
  it('should format labels', () => {
    expect(formatLabel('Short')).toBe('Short');
    expect(formatLabel('This is a very long label that needs truncation')).toBe('This is a very lo...');
    expect(formatLabel('Exactly twenty chars!', 21)).toBe('Exactly twenty chars!');
  });

  it('should calculate chart dimensions', () => {
    expect(calculateChartDimensions(800, 600, 1.5)).toEqual({ width: 800, height: 600 });
    expect(calculateChartDimensions(undefined, undefined, 1.5)).toEqual({ width: 800, height: 533 });
    expect(calculateChartDimensions(600, undefined)).toEqual({ width: 600, height: 400 });
  });

  it('should validate data points', () => {
    expect(validateDataPoints([1, 2, 3], 'bar')).toEqual({ valid: true });
    expect(validateDataPoints([1.5, 2.5, 3.5], 'line')).toEqual({ valid: true });
    expect(validateDataPoints([0, 0, 0], 'pie')).toEqual({ valid: true });
  });

  it('should sanitize chart title', () => {
    expect(sanitizeChartTitle('  Test   Title  ')).toBe('Test Title');
    expect(sanitizeChartTitle('Multiple   Spaces')).toBe('Multiple Spaces');
  });
});

describe('Bar Chart Configuration', () => {
  it('should create bar chart config', () => {
    const config = createBarChartConfig(
      'Sales Chart',
      ['Jan', 'Feb', 'Mar'],
      [{ label: 'Sales', data: [100, 200, 150] }]
    );

    expect(config.type).toBe('bar');
    expect(config.title).toBe('Sales Chart');
    expect(config.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(config.data.datasets).toHaveLength(1);
  });

  it('should create horizontal bar chart config', () => {
    const config = createHorizontalBarChartConfig(
      'Ranking',
      ['A', 'B', 'C'],
      { label: 'Score', data: [90, 80, 70] }
    );

    expect(config.type).toBe('horizontalBar');
  });

  it('should create stacked bar chart config', () => {
    const config = createStackedBarChartConfig(
      'Stacked Chart',
      ['Q1', 'Q2'],
      [
        { label: 'Product A', data: [100, 200] },
        { label: 'Product B', data: [150, 250] }
      ]
    );

    expect(config.options.scales?.x?.stacked).toBe(true);
    expect(config.options.scales?.y?.stacked).toBe(true);
  });

  it('should create grouped bar chart config', () => {
    const config = createGroupedBarChartConfig(
      'Grouped Chart',
      ['A', 'B', 'C'],
      [
        { label: 'Group 1', data: [10, 20, 30] },
        { label: 'Group 2', data: [15, 25, 35] }
      ]
    );

    expect(config.data.datasets).toHaveLength(2);
  });

  it('should validate bar chart data', () => {
    expect(validateBarChartData([10, 20, 30], ['A', 'B', 'C'])).toEqual({ valid: true });
    expect(validateBarChartData([10, 20], ['A', 'B', 'C'])).toEqual({ 
      valid: false, 
      error: 'Data and labels must have the same length' 
    });
    expect(validateBarChartData([10, -5, 30], ['A', 'B', 'C'])).toEqual({ 
      valid: false, 
      error: expect.stringContaining('Invalid data value') 
    });
  });
});

describe('Line Chart Configuration', () => {
  it('should create line chart config', () => {
    const config = createLineChartConfig(
      'Trend Chart',
      ['Jan', 'Feb', 'Mar', 'Apr'],
      [{ label: 'Revenue', data: [1000, 1500, 1200, 1800] }]
    );

    expect(config.type).toBe('line');
    expect(config.data.labels).toHaveLength(4);
  });

  it('should create area chart config with fill', () => {
    const config = createAreaChartConfig(
      'Area Chart',
      ['A', 'B', 'C'],
      [{ label: 'Data', data: [10, 20, 15] }]
    );

    expect(config.data.datasets[0].fill).toBe(true);
  });

  it('should create stepped line chart config', () => {
    const config = createSteppedLineChartConfig(
      'Step Chart',
      ['A', 'B', 'C'],
      [{ label: 'Steps', data: [10, 20, 15] }]
    );

    expect(config.type).toBe('line');
  });

  it('should validate line chart data', () => {
    expect(validateLineChartData([10, 20, 30], ['A', 'B', 'C'])).toEqual({ valid: true });
    expect(validateLineChartData([10, NaN, 30], ['A', 'B', 'C'])).toEqual({ 
      valid: false, 
      error: expect.stringContaining('Invalid data value') 
    });
  });
});

describe('Pie Chart Configuration', () => {
  it('should create pie chart config', () => {
    const config = createPieChartConfig(
      'Distribution',
      ['A', 'B', 'C'],
      [30, 50, 20]
    );

    expect(config.type).toBe('pie');
    expect(config.data.datasets[0].data).toEqual([30, 50, 20]);
  });

  it('should create doughnut chart config', () => {
    const config = createDoughnutChartConfig(
      'Doughnut Chart',
      ['A', 'B', 'C'],
      [25, 50, 25]
    );

    expect(config.type).toBe('doughnut');
    expect(config.options.cutoutPercentage).toBe(50);
  });

  it('should create polar area chart config', () => {
    const config = createPolarAreaChartConfig(
      'Polar Chart',
      ['A', 'B', 'C', 'D'],
      [10, 20, 15, 25]
    );

    expect(config.type).toBe('polarArea');
  });

  it('should validate pie chart data', () => {
    expect(validatePieChartData([30, 50, 20], ['A', 'B', 'C'])).toEqual({ valid: true });
    expect(validatePieChartData([0, 0, 0], ['A', 'B', 'C'])).toEqual({ 
      valid: false, 
      error: 'Total of all data values cannot be zero' 
    });
    expect(validatePieChartData([30, 50], ['A', 'B', 'C'])).toEqual({ 
      valid: false, 
      error: 'Data and labels must have the same length' 
    });
  });
});

describe('Chart Configuration Schema', () => {
  it('should validate chart with all optional fields', () => {
    const config: ChartConfig = {
      id: 'full-config-chart',
      type: 'bar',
      title: 'Full Configuration Chart',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Revenue',
            data: [100, 150, 120, 180],
            backgroundColor: ['#1a365d', '#2c5282', '#3182ce', '#4299e1'],
            borderColor: '#1a365d',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: [80, 100, 90, 110],
            backgroundColor: ['#ed8936', '#f56565', '#48bb78', '#9f7aea'],
            borderColor: '#ed8936',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        title: {
          text: 'Full Configuration Chart',
          fontSize: 16,
          fontColor: '#1a202c',
          fontFamily: 'Helvetica',
          padding: 15
        },
        legend: {
          display: true,
          position: 'top',
          fontSize: 12,
          fontFamily: 'Helvetica',
          fontColor: '#1a202c',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        scales: {
          x: {
            display: true,
            title: 'Quarter',
            fontSize: 12,
            fontColor: '#4a5568',
            gridColor: '#e2e8f0',
            gridLineWidth: 1,
            min: 0,
            max: 4,
            stacked: false,
            beginAtZero: true,
            ticks: {
              fontSize: 10,
              fontColor: '#4a5568',
              stepSize: 1
            }
          },
          y: {
            display: true,
            title: 'Amount ($)',
            fontSize: 12,
            fontColor: '#4a5568',
            gridColor: '#e2e8f0',
            gridLineWidth: 1,
            min: 0,
            max: 200,
            stacked: false,
            beginAtZero: true,
            ticks: {
              fontSize: 10,
              fontColor: '#4a5568',
              stepSize: 50
            }
          }
        },
        tooltips: {
          enabled: false
        },
        layout: {
          padding: 25
        }
      },
      width: 1000,
      height: 500,
      style: {
        backgroundColor: '#f7fafc',
        borderColor: '#e2e8f0',
        fontFamily: 'Helvetica',
        fontSize: 14,
        gridColor: '#e2e8f0',
        legendPosition: 'bottom'
      }
    };

    const result = ChartConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate pie chart with cutout', () => {
    const config: ChartConfig = {
      id: 'pie-with-cutout',
      type: 'doughnut',
      title: 'Pie with Cutout',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Distribution',
          data: [25, 35, 20, 20],
          backgroundColor: ['#1a365d', '#2c5282', '#3182ce', '#4299e1'],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        legend: {
          display: true,
          position: 'right'
        },
        tooltips: {
          enabled: false
        }
      },
      cutoutPercentage: 60,
      rotation: 0,
      circumference: 360
    };

    const result = ChartConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate scatter chart with data points', () => {
    const config: ChartConfig = {
      id: 'scatter-chart',
      type: 'scatter',
      title: 'Scatter Plot',
      data: {
        labels: [],
        datasets: [{
          label: 'Points',
          data: [
            { x: 10, y: 20 },
            { x: 15, y: 25 },
            { x: 20, y: 18 },
            { x: 25, y: 30 }
          ],
          backgroundColor: '#3182ce',
          borderColor: '#1a365d',
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        scales: {
          x: {
            display: true,
            min: 0,
            max: 30
          },
          y: {
            display: true,
            min: 0,
            max: 40
          }
        },
        tooltips: {
          enabled: false
        }
      }
    };

    const result = ChartConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate bubble chart with data points', () => {
    const config: ChartConfig = {
      id: 'bubble-chart',
      type: 'bubble',
      title: 'Bubble Chart',
      data: {
        labels: [],
        datasets: [{
          label: 'Bubbles',
          data: [
            { x: 10, y: 20, radius: 10 },
            { x: 15, y: 25, radius: 15 },
            { x: 20, y: 18, radius: 8 }
          ],
          backgroundColor: 'rgba(49, 130, 206, 0.5)',
          borderColor: '#1a365d',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false,
        tooltips: {
          enabled: false
        }
      }
    };

    const result = ChartConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('Chart Style Configuration', () => {
  it('should create chart with custom style', () => {
    const style: ChartStyle = {
      backgroundColor: '#f0f0f0',
      borderColor: '#cccccc',
      fontFamily: 'Arial',
      fontSize: 12,
      gridColor: '#dddddd',
      legendPosition: 'bottom'
    };

    const config: ChartConfig = {
      id: 'styled-chart',
      type: 'line',
      title: 'Styled Chart',
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Data',
          data: [10, 20, 15]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: false
      },
      style
    };

    expect(config.style?.backgroundColor).toBe('#f0f0f0');
    expect(config.style?.legendPosition).toBe('bottom');
  });
});

describe('Chart Data Validation', () => {
  it('should validate data points for scatter chart', () => {
    const scatterData = [
      { x: 10, y: 20 },
      { x: 15, y: 25 }
    ];
    
    const result = validateDataPoints(scatterData, 'scatter');
    expect(result.valid).toBe(true);
  });

  it('should validate data points for bubble chart', () => {
    const bubbleData = [
      { x: 10, y: 20, radius: 5 },
      { x: 15, y: 25, radius: 10 }
    ];
    
    const result = validateDataPoints(bubbleData, 'bubble');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid scatter data', () => {
    const invalidData = [10, 20, 30];
    
    const result = validateDataPoints(invalidData, 'scatter');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('scatter');
  });
});

describe('Color Accessibility', () => {
  it('should generate high contrast colors', () => {
    const palette = generateColorPalette(5, professionalPalette.categorical);
    
    palette.forEach(color => {
      const contrast = getContrastColor(color);
      expect(contrast).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('should generate sufficient color variety', () => {
    const blues = professionalPalette.blues;
    const categorical = professionalPalette.categorical;
    
    expect(blues.length).toBeGreaterThanOrEqual(5);
    expect(categorical.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Chart Rendering Integration', () => {
  it('should create renderable chart configuration', () => {
    const config = createBarChartConfig(
      'Test Chart',
      ['Category 1', 'Category 2', 'Category 3'],
      [
        { label: 'Series A', data: [25, 40, 30] },
        { label: 'Series B', data: [35, 25, 45] }
      ]
    );

    expect(config.id).toBeDefined();
    expect(config.type).toBeDefined();
    expect(config.data).toBeDefined();
    expect(config.options).toBeDefined();
    
    expect(config.options.responsive).toBe(true);
    expect(config.options.animation).toBe(false);
  });
});
