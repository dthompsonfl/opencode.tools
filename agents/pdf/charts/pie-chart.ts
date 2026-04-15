import { ChartConfig } from '../graphics/chart-config';
import {
  generateChartColors,
  getDefaultFontFamily,
  getDefaultFontColor,
  getContrastColor,
  formatLabel
} from './chart-helpers';

export interface PieChartOptions {
  cutoutPercentage?: number;
  rotation?: number;
  circumference?: number;
}

export function createPieChartConfig(
  title: string,
  labels: string[],
  data: number[],
  options?: Partial<PieChartOptions>
): ChartConfig {
  const colors = generateChartColors(labels.length);
  // Text colors for accessibility - used for label rendering
  colors.map(color => getContrastColor(color));

  const config: ChartConfig = {
    id: `pie-chart-${Date.now()}`,
    type: 'pie',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: [{
        label: title,
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      title: {
        text: title,
        fontSize: 14,
        fontColor: getDefaultFontColor(),
        fontFamily: getDefaultFontFamily(),
        padding: 10
      },
      legend: {
        display: true,
        position: 'right',
        fontSize: 11,
        fontFamily: getDefaultFontFamily(),
        fontColor: getDefaultFontColor(),
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 20
      },
      cutoutPercentage: options?.cutoutPercentage ?? 0,
      rotation: options?.rotation ?? 0,
      circumference: options?.circumference ?? 360
    },
    width: 600,
    height: 400,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function createDoughnutChartConfig(
  title: string,
  labels: string[],
  data: number[],
  options?: Partial<PieChartOptions>
): ChartConfig {
  const colors = generateChartColors(labels.length);

  const config: ChartConfig = {
    id: `doughnut-chart-${Date.now()}`,
    type: 'doughnut',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: [{
        label: title,
        data: data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      title: {
        text: title,
        fontSize: 14,
        fontColor: getDefaultFontColor(),
        fontFamily: getDefaultFontFamily(),
        padding: 10
      },
      legend: {
        display: true,
        position: 'right',
        fontSize: 11,
        fontFamily: getDefaultFontFamily(),
        fontColor: getDefaultFontColor(),
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 20
      },
      cutoutPercentage: options?.cutoutPercentage ?? 50,
      rotation: options?.rotation ?? 0,
      circumference: options?.circumference ?? 360
    },
    width: 600,
    height: 400,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function createPolarAreaChartConfig(
  title: string,
  labels: string[],
  data: number[]
): ChartConfig {
  const colors = generateChartColors(labels.length, true);

  const config: ChartConfig = {
    id: `polar-area-chart-${Date.now()}`,
    type: 'polarArea',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: [{
        label: title,
        data: data,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      title: {
        text: title,
        fontSize: 14,
        fontColor: getDefaultFontColor(),
        fontFamily: getDefaultFontFamily(),
        padding: 10
      },
      legend: {
        display: true,
        position: 'right',
        fontSize: 11,
        fontFamily: getDefaultFontFamily(),
        fontColor: getDefaultFontColor(),
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 20
      }
    },
    width: 600,
    height: 500,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function createNestedPieChartConfig(
  title: string,
  innerLabels: string[],
  innerData: number[],
  outerLabels: string[],
  outerData: number[]
): ChartConfig {
  const innerColors = generateChartColors(innerLabels.length, true);
  const outerColors = generateChartColors(outerLabels.length, true);

  const config: ChartConfig = {
    id: `nested-pie-chart-${Date.now()}`,
    type: 'pie',
    title,
    data: {
      labels: outerLabels.map(label => formatLabel(label)),
      datasets: [
        {
          label: 'Inner',
          data: innerData,
          backgroundColor: innerColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          weight: 0.5
        },
        {
          label: 'Outer',
          data: outerData,
          backgroundColor: outerColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          weight: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      title: {
        text: title,
        fontSize: 14,
        fontColor: getDefaultFontColor(),
        fontFamily: getDefaultFontFamily(),
        padding: 10
      },
      legend: {
        display: true,
        position: 'right',
        fontSize: 11,
        fontFamily: getDefaultFontFamily(),
        fontColor: getDefaultFontColor(),
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 20
      }
    },
    width: 700,
    height: 500,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function validatePieChartData(
  data: number[],
  labels: string[]
): { valid: boolean; error?: string } {
  if (data.length !== labels.length) {
    return { valid: false, error: 'Data and labels must have the same length' };
  }

  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] !== 'number' || isNaN(data[i]) || data[i] < 0) {
      return { valid: false, error: `Invalid data value at index ${i}: must be a non-negative number` };
    }
  }

  const total = data.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return { valid: false, error: 'Total of all data values cannot be zero' };
  }

  return { valid: true };
}
