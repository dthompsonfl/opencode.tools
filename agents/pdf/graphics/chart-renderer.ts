import {
  ChartConfig,
  ChartConfigSchema,
  ChartType
} from './chart-config';
import {
  getDefaultFontFamily,
  getDefaultFontColor,
  getDefaultGridColor,
  calculateChartDimensions
} from '../charts/chart-helpers';
import { createCanvas, CanvasRenderingContext2D } from './mock-canvas';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chart-renderer' },
  transports: [
    new winston.transports.File({ filename: 'logs/chart-renderer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/chart-renderer.log' })
  ]
});

export class ChartRenderingError extends Error {
  constructor(
    message: string,
    public chartId: string,
    public chartType: ChartType,
    public cause?: Error
  ) {
    super(`Chart rendering error for ${chartId} (${chartType}): ${message}`);
    this.name = 'ChartRenderingError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ChartRendererOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  devicePixelRatio?: number;
  backgroundColor?: string;
}

export class ChartRenderer {
  private options: ChartRendererOptions;
  private chartInstances: Map<string, unknown>;

  constructor(options: ChartRendererOptions = {}) {
    this.options = {
      defaultWidth: options.defaultWidth || 800,
      defaultHeight: options.defaultHeight || 400,
      devicePixelRatio: options.devicePixelRatio || 2,
      backgroundColor: options.backgroundColor || '#ffffff'
    };
    this.chartInstances = new Map();
  }

  async render(chartConfig: ChartConfig, runId: string): Promise<Buffer> {
    const chartId = chartConfig.id;
    
    try {
      logger.info('Starting chart rendering', {
        chartId,
        chartType: chartConfig.type,
        runId
      });

      const validationResult = ChartConfigSchema.safeParse(chartConfig);
      if (!validationResult.success) {
        throw new ChartRenderingError(
          `Invalid chart configuration: ${validationResult.error.message}`,
          chartId,
          chartConfig.type
        );
      }

      const dimensions = calculateChartDimensions(
        chartConfig.width,
        chartConfig.height,
        1.5
      );

      const canvas = createCanvas(dimensions.width, dimensions.height);
      const ctx = canvas.getContext('2d');

      const bgColor = chartConfig.style?.backgroundColor || this.options.backgroundColor || '#ffffff';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      this.renderChart(ctx, chartConfig, dimensions);

      const buffer = canvas.toBuffer('image/png');

      logger.info('Chart rendered successfully', {
        chartId,
        chartType: chartConfig.type,
        bufferSize: buffer.length,
        runId
      });

      return buffer;
    } catch (error) {
      const chartError = error instanceof ChartRenderingError
        ? error
        : new ChartRenderingError(
            error instanceof Error ? error.message : 'Unknown error',
            chartId,
            chartConfig.type,
            error instanceof Error ? error : undefined
          );

      logger.error('Chart rendering failed', {
        chartId,
        chartType: chartConfig.type,
        error: chartError.message,
        stack: chartError.stack,
        runId
      });

      throw chartError;
    }
  }

  async renderToBuffer(chartConfig: ChartConfig, runId?: string): Promise<Buffer> {
    return this.render(chartConfig, runId || `render-${Date.now()}`);
  }

  async renderToSVG(chartConfig: ChartConfig): Promise<string> {
    const chartId = chartConfig.id;
    
    try {
      logger.info('Starting SVG chart rendering', {
        chartId,
        chartType: chartConfig.type
      });

      const validationResult = ChartConfigSchema.safeParse(chartConfig);
      if (!validationResult.success) {
        throw new ChartRenderingError(
          `Invalid chart configuration: ${validationResult.error.message}`,
          chartId,
          chartConfig.type
        );
      }

      const dimensions = calculateChartDimensions(
        chartConfig.width,
        chartConfig.height,
        1.5
      );

      const svg = this.generateSVG(chartConfig, dimensions);

      logger.info('SVG chart generated successfully', {
        chartId,
        chartType: chartConfig.type,
        svgLength: svg.length
      });

      return svg;
    } catch (error) {
      const chartError = error instanceof ChartRenderingError
        ? error
        : new ChartRenderingError(
            error instanceof Error ? error.message : 'Unknown error',
            chartId,
            chartConfig.type,
            error instanceof Error ? error : undefined
          );

      logger.error('SVG chart generation failed', {
        chartId,
        chartType: chartConfig.type,
        error: chartError.message
      });

      throw chartError;
    }
  }

  private renderChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    dimensions: { width: number; height: number }
  ): void {
    const { width, height } = dimensions;
    const padding = config.options.layout?.padding as number || 20;
    const titlePadding = config.options.title?.padding || 10;

    const chartArea = {
      x: padding,
      y: padding + (config.options.title ? 30 + titlePadding : 0),
      width: width - padding * 2,
      height: height - padding * 2 - (config.options.title ? 30 + titlePadding : 0)
    };

    this.renderTitle(ctx, config, chartArea, padding);
    this.renderLegend(ctx, config, chartArea, width);
    this.renderChartArea(ctx, config, chartArea);
  }

  private renderTitle(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number },
    padding: number
  ): void {
    if (!config.options.title) return;

    const title = config.options.title;
    ctx.fillStyle = title.fontColor || getDefaultFontColor();
    ctx.font = `${title.fontSize || 16}px ${title.fontFamily || getDefaultFontFamily()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const titleX = chartArea.x + chartArea.width / 2;
    const titleY = padding + (title.padding || 10);

    ctx.fillText(title.text, titleX, titleY);
  }

  private renderLegend(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number },
    _totalWidth: number
  ): void {
    if (!config.options.legend?.display || config.data.datasets.length === 1) return;

    const legend = config.options.legend;
    const legendWidth = 120;
    const legendHeight = config.data.datasets.length * 20 + 20;
    const legendX = legend.position === 'right' 
      ? chartArea.x + chartArea.width - legendWidth - 10
      : chartArea.x + 10;
    const legendY = chartArea.y + 10;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(legendX - 5, legendY - 5, legendWidth, legendHeight);

    ctx.font = `${legend.fontSize || 11}px ${legend.fontFamily || getDefaultFontFamily()}`;
    ctx.fillStyle = legend.fontColor || getDefaultFontColor();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    config.data.datasets.forEach((dataset, index) => {
      const color = Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[0] 
        : dataset.backgroundColor || '#3182ce';
      
      const y = legendY + 15 + index * 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(legendX, y - 5, 12, 12);
      
      ctx.fillStyle = legend.fontColor || getDefaultFontColor();
      ctx.fillText(dataset.label, legendX + 18, y);
    });
  }

  private renderChartArea(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    switch (config.type) {
      case 'bar':
      case 'horizontalBar':
        this.renderBarChart(ctx, config, chartArea);
        break;
      case 'line':
        this.renderLineChart(ctx, config, chartArea);
        break;
      case 'pie':
        this.renderPieChart(ctx, config, chartArea);
        break;
      case 'doughnut':
        this.renderDoughnutChart(ctx, config, chartArea);
        break;
      case 'radar':
        this.renderRadarChart(ctx, config, chartArea);
        break;
      case 'polarArea':
        this.renderPolarAreaChart(ctx, config, chartArea);
        break;
      case 'bubble':
      case 'scatter':
        this.renderScatterChart(ctx, config, chartArea);
        break;
      default:
        throw new ChartRenderingError(
          `Unsupported chart type: ${config.type}`,
          config.id,
          config.type
        );
    }
  }

  private renderBarChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const labels = config.data.labels;
    const datasets = config.data.datasets;
    const isHorizontal = config.type === 'horizontalBar';

    const barCount = labels.length;
    const datasetCount = datasets.length;
    const barGroupWidth = chartArea.width / barCount;
    const barWidth = Math.min((barGroupWidth * 0.7) / datasetCount, 40);
    const barGap = (barGroupWidth * 0.7 - barWidth * datasetCount) / (datasetCount - 1 || 1);

    const dataValues = datasets.flatMap(d => 
      d.data.map(v => typeof v === 'number' ? v : v.y)
    );
    const maxValue = Math.max(...dataValues);
    const chartHeight = chartArea.height - 30;

    ctx.strokeStyle = getDefaultGridColor();
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = chartArea.y + 30 + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartArea.x, y);
      ctx.lineTo(chartArea.x + chartArea.width, y);
      ctx.stroke();

      const value = Math.round(maxValue * (1 - i / 5));
      ctx.fillStyle = getDefaultFontColor();
      ctx.font = '10px Helvetica';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), chartArea.x - 5, y);
    }

    datasets.forEach((dataset, datasetIndex) => {
      const colors = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor
        : Array(labels.length).fill(dataset.backgroundColor || '#3182ce');

      dataset.data.forEach((value, index) => {
        const numValue = typeof value === 'number' ? value : value.y;
        const barHeight = (numValue / maxValue) * chartHeight;
        
        const x = isHorizontal
          ? chartArea.x
          : chartArea.x + index * barGroupWidth + (barWidth + barGap) * datasetIndex + barGap;
        const y = isHorizontal
          ? chartArea.y + 30 + index * (chartHeight / barCount) + (chartHeight / barCount - barWidth) / 2
          : chartArea.y + 30 + chartHeight - barHeight;
        const width = isHorizontal
          ? barHeight
          : barWidth;
        const height = isHorizontal
          ? barWidth
          : barHeight;

        ctx.fillStyle = colors[index] || '#3182ce';
        ctx.fillRect(x, y, width, height);

        if (dataset.borderWidth && dataset.borderWidth > 0) {
          ctx.strokeStyle = Array.isArray(dataset.borderColor)
            ? dataset.borderColor[index] || '#ffffff'
            : dataset.borderColor || '#ffffff';
          ctx.lineWidth = dataset.borderWidth;
          ctx.strokeRect(x, y, width, height);
        }
      });
    });

    ctx.fillStyle = getDefaultFontColor();
    ctx.font = '10px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    labels.forEach((label, index) => {
      const x = chartArea.x + index * barGroupWidth + barGroupWidth / 2;
      const y = chartArea.y + 30 + chartHeight + 5;
      
      const labelText = label.length > 8 ? label.substring(0, 8) + '...' : label;
      ctx.fillText(labelText, x, y);
    });
  }

  private renderLineChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const labels = config.data.labels;
    const datasets = config.data.datasets;
    const pointRadius = datasets[0]?.pointRadius || 3;
    const tension = datasets[0]?.tension || 0.3;

    const dataValues = datasets.flatMap(d => 
      d.data.map(v => typeof v === 'number' ? v : v.y)
    );
    const maxValue = Math.max(...dataValues);
    const chartHeight = chartArea.height - 30;

    ctx.strokeStyle = getDefaultGridColor();
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = chartArea.y + 30 + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartArea.x, y);
      ctx.lineTo(chartArea.x + chartArea.width, y);
      ctx.stroke();

      const value = Math.round(maxValue * (1 - i / 5));
      ctx.fillStyle = getDefaultFontColor();
      ctx.font = '10px Helvetica';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), chartArea.x - 5, y);
    }

    datasets.forEach((dataset) => {
      const color = Array.isArray(dataset.borderColor)
        ? dataset.borderColor[0]
        : dataset.borderColor || '#3182ce';

      ctx.strokeStyle = color;
      ctx.lineWidth = dataset.borderWidth || 2;
      ctx.setLineDash(dataset.borderDash || []);

      const points = dataset.data.map((value, index) => {
        const numValue = typeof value === 'number' ? value : value.y;
        const x = chartArea.x + (index / (labels.length - 1)) * chartArea.width;
        const y = chartArea.y + 30 + chartHeight - (numValue / maxValue) * chartHeight;
        return { x, y, value: numValue };
      });

      if (tension === 0) {
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const cpX = (p0.x + p1.x) / 2;
          const cpY = p0.y + (p1.y - p0.y) * tension;
          ctx.quadraticCurveTo(p0.x, cpY, cpX, (p0.y + p1.y) / 2);
        }
        ctx.stroke();
      }

      if (dataset.fill) {
        ctx.lineTo(points[points.length - 1].x, chartArea.y + 30 + chartHeight);
        ctx.lineTo(points[0].x, chartArea.y + 30 + chartHeight);
        ctx.closePath();
        ctx.fillStyle = color + '20';
        ctx.fill();
      }

      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });

    ctx.fillStyle = getDefaultFontColor();
    ctx.font = '10px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.setLineDash([]);

    labels.forEach((label, index) => {
      const x = chartArea.x + (index / (labels.length - 1)) * chartArea.width;
      const y = chartArea.y + 30 + chartHeight + 5;
      
      const labelText = label.length > 10 ? label.substring(0, 10) + '...' : label;
      ctx.fillText(labelText, x, y);
    });
  }

  private renderPieChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const data = config.data.datasets[0].data as number[];
    const colors = Array.isArray(config.data.datasets[0].backgroundColor)
      ? config.data.datasets[0].backgroundColor
      : ['#3182ce', '#63b3ed', '#90cdf4', '#4299e1', '#2c5282'];

    const total = data.reduce((sum, value) => sum + value, 0);
    const centerX = chartArea.x + chartArea.width / 2;
    const centerY = chartArea.y + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 - 20;

    let currentAngle = -Math.PI / 2;

    data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      
      if (config.data.datasets[0].borderWidth && config.data.datasets[0].borderWidth! > 0) {
        ctx.strokeStyle = config.data.datasets[0].borderColor as string || '#ffffff';
        ctx.lineWidth = config.data.datasets[0].borderWidth;
        ctx.stroke();
      }

      currentAngle += sliceAngle;
    });
  }

  private renderDoughnutChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const data = config.data.datasets[0].data as number[];
    const colors = Array.isArray(config.data.datasets[0].backgroundColor)
      ? config.data.datasets[0].backgroundColor
      : ['#3182ce', '#63b3ed', '#90cdf4', '#4299e1', '#2c5282'];
    const cutoutPercentage = config.options.cutoutPercentage || 50;

    const total = data.reduce((sum, value) => sum + value, 0);
    const centerX = chartArea.x + chartArea.width / 2;
    const centerY = chartArea.y + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 - 20;
    const innerRadius = radius * (cutoutPercentage / 100);

    let currentAngle = -Math.PI / 2;

    data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      
      if (config.data.datasets[0].borderWidth && config.data.datasets[0].borderWidth! > 0) {
        ctx.strokeStyle = config.data.datasets[0].borderColor as string || '#ffffff';
        ctx.lineWidth = config.data.datasets[0].borderWidth;
        ctx.stroke();
      }

      currentAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private renderRadarChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const labels = config.data.labels;
    const datasets = config.data.datasets;
    const centerX = chartArea.x + chartArea.width / 2;
    const centerY = chartArea.y + chartArea.height / 2;
    const radius = Math.min(chartArea.width, chartArea.height) / 2 - 40;

    const angleStep = (Math.PI * 2) / labels.length;
    const dataValues = datasets.flatMap(d => 
      d.data.map(v => typeof v === 'number' ? v : v.y)
    );
    const maxValue = Math.max(...dataValues);

    for (let i = 1; i <= 5; i++) {
      const gridRadius = (radius / 5) * i;
      ctx.beginPath();
      for (let j = 0; j <= labels.length; j++) {
        const angle = -Math.PI / 2 + j * angleStep;
        const x = centerX + Math.cos(angle) * gridRadius;
        const y = centerY + Math.sin(angle) * gridRadius;
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = getDefaultGridColor();
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let j = 0; j <= labels.length; j++) {
      const angle = -Math.PI / 2 + j * angleStep;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = getDefaultGridColor();
    ctx.lineWidth = 1;
    ctx.stroke();

    datasets.forEach((dataset) => {
      const color = Array.isArray(dataset.borderColor)
        ? dataset.borderColor[0]
        : dataset.borderColor || '#3182ce';
      const fillColor = color + '30';

      ctx.beginPath();
      dataset.data.forEach((value, index) => {
        const numValue = typeof value === 'number' ? value : value.y;
        const valueRadius = (numValue / maxValue) * radius;
        const angle = -Math.PI / 2 + index * angleStep;
        const x = centerX + Math.cos(angle) * valueRadius;
        const y = centerY + Math.sin(angle) * valueRadius;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = dataset.borderWidth || 2;
      ctx.stroke();
    });

    ctx.fillStyle = getDefaultFontColor();
    ctx.font = '11px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const x = centerX + Math.cos(angle) * (radius + 15);
      const y = centerY + Math.sin(angle) * (radius + 15);
      ctx.fillText(label, x, y);
    });
  }

  private renderPolarAreaChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const labels = config.data.labels;
    const data = config.data.datasets[0].data as number[];
    const colors = Array.isArray(config.data.datasets[0].backgroundColor)
      ? config.data.datasets[0].backgroundColor
      : ['#3182ce', '#63b3ed', '#90cdf4', '#4299e1', '#2c5282'];

    const maxValue = Math.max(...data);
    const centerX = chartArea.x + chartArea.width / 2;
    const centerY = chartArea.y + chartArea.height / 2;
    const maxRadius = Math.min(chartArea.width, chartArea.height) / 2 - 20;

    const angleStep = Math.PI / labels.length;

    for (let i = 1; i <= 5; i++) {
      const gridRadius = (maxRadius / 5) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, gridRadius, 0, Math.PI * 2);
      ctx.strokeStyle = getDefaultGridColor();
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - maxRadius);
    for (let i = 1; i < labels.length; i++) {
      const angle = i * angleStep;
      const x = centerX + Math.cos(angle) * maxRadius;
      const y = centerY + Math.sin(angle) * maxRadius;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = getDefaultGridColor();
    ctx.lineWidth = 1;
    ctx.stroke();

    data.forEach((value, index) => {
      const valueRadius = (value / maxValue) * maxRadius;
      const angle = index * angleStep;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, valueRadius, angle, angle + angleStep);
      ctx.closePath();
      
      ctx.fillStyle = (colors[index % colors.length] as string) + '80';
      ctx.fill();
      ctx.strokeStyle = colors[index % colors.length] as string;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.fillStyle = getDefaultFontColor();
    ctx.font = '11px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    labels.forEach((label, index) => {
      const angle = index * angleStep + angleStep / 2;
      const x = centerX + Math.cos(angle) * (maxRadius + 15);
      const y = centerY + Math.sin(angle) * (maxRadius + 15);
      ctx.fillText(label, x, y);
    });
  }

  private renderScatterChart(
    ctx: CanvasRenderingContext2D,
    config: ChartConfig,
    chartArea: { x: number; y: number; width: number; height: number }
  ): void {
    const datasets = config.data.datasets;

    const dataValues = datasets.flatMap(d => 
      d.data.map(v => typeof v === 'number' ? v : v.y)
    );
    const maxValue = Math.max(...dataValues);
    const chartHeight = chartArea.height - 30;

    ctx.strokeStyle = getDefaultGridColor();
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = chartArea.y + 30 + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartArea.x, y);
      ctx.lineTo(chartArea.x + chartArea.width, y);
      ctx.stroke();

      const value = Math.round(maxValue * (1 - i / 5));
      ctx.fillStyle = getDefaultFontColor();
      ctx.font = '10px Helvetica';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), chartArea.x - 5, y);
    }

    datasets.forEach((dataset) => {
      const color = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[0]
        : dataset.backgroundColor || '#3182ce';

      const dataArray = dataset.data as Array<{ x: number; y: number }>;
      const maxX = Math.max(...dataArray.map(d => d.x));

      dataArray.forEach((point) => {
        const x = chartArea.x + (point.x / maxX) * chartArea.width;
        const y = chartArea.y + 30 + chartHeight - (point.y / maxValue) * chartHeight;
        const radius = dataset.pointRadius || 5;

        if (config.type === 'bubble') {
          ctx.beginPath();
          ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = color + '40';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    });

    ctx.fillStyle = getDefaultFontColor();
    ctx.font = '10px Helvetica';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.setLineDash([]);

    for (let i = 0; i <= 5; i++) {
      const x = chartArea.x + (chartArea.width / 5) * i;
      const value = Math.round((maxValue / 5) * i);
      ctx.fillText(value.toString(), x, chartArea.y + 30 + chartHeight + 5);
    }
  }

  private generateSVG(config: ChartConfig, dimensions: { width: number; height: number }): string {
    const { width, height } = dimensions;
    const padding = config.options.layout?.padding as number || 20;
    const titlePadding = config.options.title?.padding || 10;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="${config.style?.backgroundColor || '#ffffff'}"/>`;

    if (config.options.title) {
      svg += `<text x="${width / 2}" y="${padding + titlePadding}" 
               text-anchor="middle" 
               font-family="${config.options.title.fontFamily || 'Helvetica'}" 
               font-size="${config.options.title.fontSize || 16}"
               fill="${config.options.title.fontColor || getDefaultFontColor()}">
               ${this.escapeXml(config.options.title.text)}
               </text>`;
    }

    svg += '</svg>';
    return svg;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
