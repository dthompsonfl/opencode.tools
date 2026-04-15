import * as readline from 'readline';
import {
  ChartConfig, ChartType, ChartData, ChartOptions,
  ChartDataset, ChartWizardState
} from '@/types/pdf';
import { displaySection, confirm, selectOption } from './tui-utils';

const chartTypes: { id: ChartType; label: string; description: string }[] = [
  { id: 'bar', label: 'Bar Chart', description: 'Compare values across categories' },
  { id: 'line', label: 'Line Chart', description: 'Show trends over time' },
  { id: 'pie', label: 'Pie Chart', description: 'Show proportions of a whole' },
  { id: 'doughnut', label: 'Doughnut Chart', description: 'Pie chart with center cutout' },
  { id: 'radar', label: 'Radar Chart', description: 'Compare multiple variables' },
  { id: 'polar', label: 'Polar Area Chart', description: 'Show multivariate data' },
  { id: 'scatter', label: 'Scatter Plot', description: 'Show correlation between variables' },
  { id: 'bubble', label: 'Bubble Chart', description: 'Scatter plot with sized bubbles' }
];

export class ChartBuilder {
  private rl: readline.Interface;
  private state: ChartWizardState;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.state = {
      charts: [],
      editing: false
    };
  }

  async run(): Promise<ChartConfig[]> {
    try {
      displaySection('Chart Builder');

      let continueAdding = true;

      while (continueAdding) {
        const chart = await this.createNewChart();
        this.state.charts.push(chart);

    if (this.state.charts.length > 0) {
      console.log('\nCurrent Charts:');
      this.state.charts.forEach((c: ChartConfig, idx: number) => {
        console.log(`  ${idx + 1}. ${c.type} - ${c.title || 'Untitled'}`);
      });
    }

        continueAdding = await confirm('\nAdd another chart');
      }

      return this.state.charts;
    } finally {
      this.rl.close();
    }
  }

  async createNewChart(): Promise<ChartConfig> {
    const chartType = await this.selectChartType();
    const title = await this.askQuestion('Enter chart title: ');
    const data = await this.enterChartData();
    const options = await this.configureOptions();

    return {
      id: `chart-${Date.now()}`,
      type: chartType,
      title,
      data,
      options
    };
  }

  private async selectChartType(): Promise<ChartType> {
    return await selectOption('Select chart type:', chartTypes);
  }

  private async enterChartData(): Promise<ChartData> {
    displaySection('Chart Data Entry');

    const labels: string[] = [];
    const datasets: ChartDataset[] = [];

    let addLabel = true;
    while (addLabel) {
      const label = await this.askQuestion('Enter label (or press Enter to finish): ');
      if (label.trim()) {
        labels.push(label.trim());
        addLabel = await this.confirm('Add another label');
      } else {
        addLabel = false;
      }
    }

    let addDataset = true;
    while (addDataset) {
      const dataset = await this.gatherDataset();
      datasets.push(dataset);
      addDataset = await this.confirm('Add another dataset');
    }

    return { labels, datasets };
  }

  private async gatherDataset(): Promise<ChartDataset> {
    const label = await this.askQuestion('Dataset label: ');
    const dataStr = await this.askQuestion('Data values (comma-separated): ');
    const data = dataStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const color = await this.askQuestion('Color (hex, e.g., #3498db): ');

    return {
      label,
      data,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1
    };
  }

  private async configureOptions(): Promise<ChartOptions> {
    displaySection('Chart Options');

    const showLegend = await this.confirm('Show legend');
    const showGrid = await this.confirm('Show grid lines');
    const responsive = await this.confirm('Enable responsive scaling');

    const xLabel = await this.askQuestion('X-axis label (optional): ');
    const yLabel = await this.askQuestion('Y-axis label (optional): ');

    const colors = await this.confirm('Use automatic color scheme');

    return {
      legend: { display: showLegend, position: 'top' as const },
      grid: { display: showGrid },
      responsive,
      xLabel: xLabel || undefined,
      yLabel: yLabel || undefined,
      colors
    };
  }

  private async previewChart(chart: ChartConfig): Promise<void> {
    displaySection('Chart Preview');

    console.log(`Type: ${chart.type}`);
    console.log(`Title: ${chart.title}`);
    console.log(`Labels: ${chart.data.labels.join(', ')}`);
    console.log(`Datasets: ${chart.data.datasets.length}`);
    console.log('');

    const regenerate = await this.confirm('Regenerate with different settings');
    if (regenerate) {
      return;
    }

    const edit = await this.confirm('Edit specific settings');
    if (edit) {
      await this.editChart(chart);
    }
  }

  async editChart(chart: ChartConfig): Promise<ChartConfig> {
    const editOptions = [
      { id: 'title', label: 'Edit Title', description: 'Change the chart title' },
      { id: 'data', label: 'Edit Data', description: 'Modify chart data' },
      { id: 'options', label: 'Edit Options', description: 'Change chart options' },
      { id: 'done', label: 'Done', description: 'Finish editing' }
    ];

    let editing = true;

    while (editing) {
      const choice = await selectOption('What to edit:', editOptions);

      switch (choice) {
        case 'title':
          chart.title = await this.askQuestion('Enter new title: ');
          break;
        case 'data':
          chart.data = await this.enterChartData();
          break;
        case 'options':
          chart.options = await this.configureOptions();
          break;
        case 'done':
          editing = false;
          break;
      }
    }

    return chart;
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

export default ChartBuilder;
