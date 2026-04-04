import { ChartConfig } from '../graphics/chart-config';
import {
  generateChartColors,
  getDefaultFontFamily,
  getDefaultFontColor,
  formatLabel
} from './chart-helpers';

export interface LineChartOptions {
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  stepped?: boolean;
  spanGaps?: boolean;
}

export function createLineChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>,
  options?: Partial<LineChartOptions>
): ChartConfig {
  const colors = generateChartColors(datasets.length);

  const config: ChartConfig = {
    id: `line-chart-${Date.now()}`,
    type: 'line',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: colors[index],
        backgroundColor: colors[index] + '20',
        borderWidth: 2,
        tension: options?.tension ?? 0.3,
        fill: options?.fill ?? false,
        pointRadius: options?.pointRadius ?? 3,
        pointHoverRadius: 5,
        borderDash: [],
        pointBackgroundColor: colors[index],
        pointBorderColor: colors[index]
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
        display: datasets.length > 1,
        position: 'top',
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
            maxRotation: 45
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

export function createAreaChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  return createLineChartConfig(title, labels, datasets, { fill: true, tension: 0.3 });
}

export function createSteppedLineChartConfig(
  title: string,
  labels: string[],
  datasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  const colors = generateChartColors(datasets.length);

  const config: ChartConfig = {
    id: `stepped-line-chart-${Date.now()}`,
    type: 'line',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: colors[index],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [],
        stepped: true,
        pointBackgroundColor: colors[index],
        pointBorderColor: colors[index]
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
        display: datasets.length > 1,
        position: 'top',
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
            maxRotation: 45
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

export function createMultiAxisLineChartConfig(
  title: string,
  labels: string[],
  leftDatasets: Array<{ label: string; data: number[] }>,
  rightDatasets: Array<{ label: string; data: number[] }>
): ChartConfig {
  const colors = generateChartColors(leftDatasets.length + rightDatasets.length);

  const config: ChartConfig = {
    id: `multi-axis-line-chart-${Date.now()}`,
    type: 'line',
    title,
    data: {
      labels: labels.map(label => formatLabel(label)),
      datasets: [
        ...leftDatasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: colors[index],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          yAxisID: 'y'
        })),
        ...rightDatasets.map((dataset, index) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: colors[leftDatasets.length + index],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 3,
          yAxisID: 'y1'
        }))
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
        position: 'top',
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
            maxRotation: 45
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          position: 'left',
          grid: {
            display: true,
            color: '#e2e8f0',
            lineWidth: 1
          },
          ticks: {
            fontSize: 10,
            fontColor: getDefaultFontColor()
          }
        },
        y1: {
          display: true,
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
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

export function validateLineChartData(
  data: number[],
  labels: string[]
): { valid: boolean; error?: string } {
  if (data.length !== labels.length) {
    return { valid: false, error: 'Data and labels must have the same length' };
  }

  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] !== 'number' || isNaN(data[i])) {
      return { valid: false, error: `Invalid data value at index ${i}: must be a number` };
    }
  }

  return { valid: true };
}
