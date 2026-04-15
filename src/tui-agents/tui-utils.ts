import * as readline from 'readline';

export const clearScreen = (): void => {
  console.clear();
};

export const displayHeader = (title: string): void => {
  console.log('╔' + '═'.repeat(60) + '╗');
  console.log('║' + title.padEnd(60) + '║');
  console.log('╚' + '═'.repeat(60) + '╝');
};

export const displaySection = (title: string): void => {
  console.log('\n' + '─'.repeat(60));
  console.log(title);
  console.log('─'.repeat(60) + '\n');
};

export const ask = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
};

export const confirm = async (question: string): Promise<boolean> => {
  const answer = await ask(`${question} (y/n): `);
  return answer.toLowerCase().startsWith('y');
};

export const selectOption = async <T>(
  question: string,
  options: { id: T; label: string; description: string }[]
): Promise<T> => {
  console.log(question + '\n');

  options.forEach((opt, idx) => {
    console.log(`${idx + 1}. ${opt.label}`);
    console.log(`   ${opt.description}\n`);
  });

  const choice = await ask('Select option (1-' + options.length + '): ');
  const index = parseInt(choice) - 1;

  if (index >= 0 && index < options.length) {
    return options[index].id;
  }

  return selectOption(question, options);
};

export const displayProgress = async (
  message: string,
  task: () => Promise<void>
): Promise<void> => {
  console.log(message + '...');
  process.stdout.write('  ');

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠸'];
  let frame = 0;

  const interval = setInterval(() => {
    process.stdout.write('\r  ' + frames[frame] + ' ');
    frame = (frame + 1) % frames.length;
  }, 100);

  try {
    await task();
    clearInterval(interval);
    process.stdout.write('\r  ✓ Done\n');
  } catch {
    clearInterval(interval);
    process.stdout.write('\r  ✗ Failed\n');
    throw new Error('Task failed');
  }
};

export const spinner = async <T>(
  message: string,
  task: () => Promise<T>
): Promise<T> => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠸'];
  let frame = 0;

  process.stdout.write(message + ' ');

  const interval = setInterval(() => {
    process.stdout.write('\r' + ' '.repeat(message.length + 1) + '\r');
    process.stdout.write(message + ' ' + frames[frame]);
    frame = (frame + 1) % frames.length;
  }, 100);

  try {
    const result = await task();
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 20) + '\r');
    console.log('✓ ' + message);
    return result;
  } catch (error) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 20) + '\r');
    console.log('✗ ' + message);
    throw error;
  }
};

export const displayResults = async (result: { metadata: { title?: string; authors: string[]; creationDate: string; pageCount: number; fileSize: number; security?: { encryptionLevel: number } }; documentPath?: string }): Promise<void> => {
  console.clear();
  console.log('\n' + '═'.repeat(60));
  console.log('  ✓ PDF Generation Complete!');
  console.log('═'.repeat(60) + '\n');

  console.log(`📄 Document: ${result.metadata.title || 'Untitled'}`);
  console.log(`👤 Authors: ${result.metadata.authors.join(', ')}`);
  console.log(`📅 Created: ${result.metadata.creationDate}`);
  console.log(`📊 Pages: ${result.metadata.pageCount}`);
  console.log(`💾 Size: ${(result.metadata.fileSize / 1024).toFixed(2)} KB`);

  if (result.metadata.security) {
    console.log(`🔐 Security: Encrypted with ${result.metadata.security.encryptionLevel}-bit encryption`);
  }

  console.log('\n' + '─'.repeat(60));
  if (result.documentPath) {
    console.log(`📁 Output: ${result.documentPath}`);
  }
  console.log('─'.repeat(60) + '\n');

  console.log('Options:');
  console.log('  1. 📂 Open PDF');
  console.log('  2. 📄 Generate Another PDF');
  console.log('  3. 🏠 Return to Main Menu');

  const choice = await ask('\nSelect option (1-3): ');

  if (choice === '1') {
    console.log('Opening PDF...');
  } else if (choice === '2') {
    console.log('Starting new PDF generation...');
  }
};

export const handleTUIError = async (error: Error): Promise<boolean> => {
  console.clear();
  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║  ⚠️  Error Occurred                                    ║');
  console.log('╚' + '═'.repeat(58) + '╝\n');

  console.log(error.message);
  console.log('\nOptions:');
  console.log('  1. Retry');
  console.log('  2. Go Back');
  console.log('  3. Exit');

  const choice = await ask('\nSelect option (1-3): ');

  if (choice === '1') {
    return true;
  } else if (choice === '2') {
    return false;
  } else {
    process.exit(1);
    return false;
  }
};

export const gatherChartData = async (): Promise<{ labels: string[]; datasets: { label: string; data: number[]; backgroundColor: string; borderColor: string }[] }> => {
  const labels: string[] = [];
  const datasets: { label: string; data: number[]; backgroundColor: string; borderColor: string }[] = [];

  let addLabel = true;
  while (addLabel) {
    const label = await ask('Enter label (or press Enter to finish): ');
    if (label.trim()) {
      labels.push(label.trim());
      addLabel = await confirm('Add another label');
    } else {
      addLabel = false;
    }
  }

  let addDataset = true;
  while (addDataset) {
    const label = await ask('Dataset label: ');
    const dataStr = await ask('Data values (comma-separated): ');
    const data = dataStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const color = await ask('Color (hex): ');

    datasets.push({ label, data, backgroundColor: color, borderColor: color });
    addDataset = await confirm('Add another dataset');
  }

  return { labels, datasets };
};

export const gatherDataset = async (): Promise<{ label: string; data: number[]; backgroundColor: string; borderColor: string }> => {
  const label = await ask('Dataset label: ');
  const dataStr = await ask('Data values (comma-separated): ');
  const data = dataStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  const color = await ask('Color (hex): ');

  return { label, data, backgroundColor: color, borderColor: color };
};
