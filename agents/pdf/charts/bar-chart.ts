import { ChartConfig } from '../graphics/chart-config';
import {
  generateChartColors,
  getDefaultFontFamily,
  getDefaultFontColor,
  formatLabel
} from './chart-helpers';

export interface BarChartOptions {
  vertical?: boolean;
  barPercentage?: number;
  categoryPercentage?: number;
  barThickness?: number;
  maxBarThickness?: number;
}

export function createBarChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>,
  options?: Partial<BarChartOptions>
): ChartConfig {
  const isVertical = options?.vertical !== false;
  const colors = generateChartColors(datasets.length);

  const chartDatasets = datasets.map((dataset, index) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: colors[index],
    borderColor: colors[index],
    borderWidth: 1
  }));

  const chartOptions = {
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
      display: datasets.length > 1,
      position: 'top' as const,
      fontSize: 11,
      fontFamily: getDefaultFontFamily(),
      fontColor: getDefaultFontColor()
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: '#e2e8f0',
          lineWidth: 1
        },
        ticks: {
          fontSize: 10,
          fontColor: getDefaultFontColor(),
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          display: true,
          color: '#e2e8f0',
          lineWidth: 1
        },
        ticks: {
          fontSize: 10,
          fontColor: getDefaultFontColor()
        }
      }
    },
    tooltips: {
      enabled: false
    },
    layout: {
      padding: 20
    }
  };

  const config: ChartConfig = {
    id: `bar-chart-${Date.now()}`,
    type: isVertical ? 'bar' : 'horizontalBar',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: chartDatasets
    },
    options: chartOptions,
    width: 800,
    height: 400,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function createHorizontalBarChartConfig(
  title: string,
  labels: string[],
  dataset: { label: string; data: number[] }
): ChartConfig {
  return createBarChartConfig(
    title,
    labels,
    [dataset],
    { vertical: false }
  );
}

export function createStackedBarChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  const config = createBarChartConfig(title, labels, datasets);
  
  if (config.options.scales?.x) {
    config.options.scales.x.stacked = true;
  }
  if (config.options.scales?.y) {
    config.options.scales.y.stacked = true;
  }

  return config;
}

export function createGroupedBarChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  const colors = generateChartColors(datasets.length);

  const config: ChartConfig = {
    id: `grouped-bar-chart-${Date.now()}`,
    type: 'bar',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: colors[index],
        borderColor: colors[index],
        borderWidth: 1
      }))
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
        position: 'top',
        fontSize: 11,
        fontFamily: getDefaultFontFamily(),
        fontColor: getDefaultFontColor()
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            fontSize: 10,
            fontColor: getDefaultFontColor()
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: {
            display: true,
            color: '#e2e8f0',
            lineWidth: 1
          },
          ticks: {
            fontSize: 10,
            fontColor: getDefaultFontColor()
          }
        }
      },
      tooltips: {
        enabled: false
      },
      layout: {
        padding: 20
      }
    },
    width: 800,
    height: 400,
    style: {
      backgroundColor: '#ffffff',
      fontFamily: getDefaultFontFamily()
    }
  };

  return config;
}

export function validateBarChartData(
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

  return { valid: true };
}
