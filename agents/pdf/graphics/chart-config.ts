import { z } from 'zod';

export type ChartType = 
  | 'bar'
  | 'horizontalBar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'polarArea'
  | 'bubble'
  | 'scatter';

export interface ChartStyle {
  backgroundColor?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: number;
  gridColor?: string;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ChartLabel {
  text: string;
  fontSize?: number;
  fontColor?: string;
}

export interface ChartTitle {
  text: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  padding?: number;
}

export interface ChartLegend {
  display: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  labels?: {
    usePointStyle?: boolean;
    padding?: number;
    boxWidth?: number;
  };
}

export interface ChartAxis {
  display: boolean;
  title?: string;
  fontSize?: number;
  fontColor?: string;
  gridColor?: string;
  gridLineWidth?: number;
  min?: number;
  max?: number;
  stacked?: boolean;
  beginAtZero?: boolean;
  offset?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  grid?: {
    display?: boolean;
    color?: string;
    lineWidth?: number;
    drawOnChartArea?: boolean;
    drawBorder?: boolean;
  };
  ticks?: {
    fontSize?: number;
    fontColor?: string;
    stepSize?: number;
    maxRotation?: number;
    minRotation?: number;
  };
}

export interface ChartGrid {
  display: boolean;
  color?: string;
  lineWidth?: number;
  drawBorder?: boolean;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: boolean;
  title?: ChartTitle;
  legend?: ChartLegend;
  scales?: {
    x?: ChartAxis;
    y?: ChartAxis;
    y1?: ChartAxis;
  };
  grid?: ChartGrid;
  tooltips?: {
    enabled: boolean;
  };
  layout?: {
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  };
  cutoutPercentage?: number;
  rotation?: number;
  circumference?: number;
}

export interface ChartDataPoint {
  x?: number | string;
  y: number;
  label?: string;
  color?: string;
  radius?: number;
}

export interface ChartDataset {
  label: string;
  data: number[] | ChartDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderDash?: number[];
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  yAxisID?: string;
  stepped?: boolean;
  hoverOffset?: number;
  weight?: number;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  data: ChartData;
  options: ChartOptions;
  width?: number;
  height?: number;
  style?: ChartStyle;
  cutoutPercentage?: number;
  rotation?: number;
  circumference?: number;
}

export const ChartConfigSchema = z.object({
  id: z.string().min(1, 'Chart ID is required'),
  type: z.enum(['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter']),
  title: z.string().min(1, 'Chart title is required'),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(z.object({
      label: z.string(),
      data: z.array(z.union([z.number(), z.object({
        x: z.union([z.number(), z.string()]).optional(),
        y: z.number(),
        label: z.string().optional(),
        color: z.string().optional(),
        radius: z.number().optional()
      })])),
      backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
      borderColor: z.union([z.string(), z.array(z.string())]).optional(),
      borderWidth: z.number().optional(),
      borderDash: z.array(z.number()).optional(),
      fill: z.boolean().optional(),
      tension: z.number().optional(),
      pointRadius: z.number().optional(),
      pointHoverRadius: z.number().optional(),
      yAxisID: z.string().optional(),
      stepped: z.boolean().optional(),
      hoverOffset: z.number().optional(),
      weight: z.number().optional(),
      pointBackgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
      pointBorderColor: z.union([z.string(), z.array(z.string())]).optional()
    }))
  }),
  options: z.object({
    responsive: z.boolean(),
    maintainAspectRatio: z.boolean(),
    animation: z.boolean(),
    title: z.object({
      text: z.string(),
      fontSize: z.number().optional(),
      fontColor: z.string().optional(),
      fontFamily: z.string().optional(),
      padding: z.number().optional()
    }).optional(),
    legend: z.object({
      display: z.boolean(),
      position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      fontColor: z.string().optional(),
      labels: z.object({
        usePointStyle: z.boolean().optional(),
        padding: z.number().optional(),
        boxWidth: z.number().optional()
      }).optional()
    }).optional(),
    scales: z.object({
      x: z.object({
        display: z.boolean(),
        title: z.string().optional(),
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        gridColor: z.string().optional(),
        gridLineWidth: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        stacked: z.boolean().optional(),
        beginAtZero: z.boolean().optional(),
        offset: z.boolean().optional(),
        position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
        grid: z.object({
          display: z.boolean().optional(),
          color: z.string().optional(),
          lineWidth: z.number().optional(),
          drawOnChartArea: z.boolean().optional(),
          drawBorder: z.boolean().optional()
        }).optional(),
        ticks: z.object({
          fontSize: z.number().optional(),
          fontColor: z.string().optional(),
          stepSize: z.number().optional(),
          maxRotation: z.number().optional(),
          minRotation: z.number().optional()
        }).optional()
      }).optional(),
      y: z.object({
        display: z.boolean(),
        title: z.string().optional(),
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        gridColor: z.string().optional(),
        gridLineWidth: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        stacked: z.boolean().optional(),
        beginAtZero: z.boolean().optional(),
        offset: z.boolean().optional(),
        position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
        grid: z.object({
          display: z.boolean().optional(),
          color: z.string().optional(),
          lineWidth: z.number().optional(),
          drawOnChartArea: z.boolean().optional(),
          drawBorder: z.boolean().optional()
        }).optional(),
        ticks: z.object({
          fontSize: z.number().optional(),
          fontColor: z.string().optional(),
          stepSize: z.number().optional(),
          maxRotation: z.number().optional(),
          minRotation: z.number().optional()
        }).optional()
      }).optional(),
      y1: z.object({
        display: z.boolean(),
        title: z.string().optional(),
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        gridColor: z.string().optional(),
        gridLineWidth: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        stacked: z.boolean().optional(),
        beginAtZero: z.boolean().optional(),
        offset: z.boolean().optional(),
        position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
        grid: z.object({
          display: z.boolean().optional(),
          color: z.string().optional(),
          lineWidth: z.number().optional(),
          drawOnChartArea: z.boolean().optional(),
          drawBorder: z.boolean().optional()
        }).optional(),
        ticks: z.object({
          fontSize: z.number().optional(),
          fontColor: z.string().optional(),
          stepSize: z.number().optional(),
          maxRotation: z.number().optional(),
          minRotation: z.number().optional()
        }).optional()
      }).optional()
    }).optional(),
    grid: z.object({
      display: z.boolean(),
      color: z.string().optional(),
      lineWidth: z.number().optional(),
      drawBorder: z.boolean().optional()
    }).optional(),
    tooltips: z.object({
      enabled: z.boolean()
    }).optional(),
    layout: z.object({
      padding: z.union([z.number(), z.object({
        top: z.number().optional(),
        bottom: z.number().optional(),
        left: z.number().optional(),
        right: z.number().optional()
      })]).optional()
    }).optional(),
    cutoutPercentage: z.number().optional(),
    rotation: z.number().optional(),
    circumference: z.number().optional()
  }),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.object({
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    gridColor: z.string().optional(),
    legendPosition: z.enum(['top', 'bottom', 'left', 'right']).optional()
  }).optional()
});

export type ChartConfigValidationResult = z.infer<typeof ChartConfigSchema>;
