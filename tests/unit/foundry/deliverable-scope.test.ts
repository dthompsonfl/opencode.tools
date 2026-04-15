import {
  classifyDeliverablePath,
  evaluateDeliverableScope,
  parseGitStatusPaths,
} from '../../../src/foundry/deliverable-scope';

describe('deliverable scope policy', () => {
  it('parses git porcelain output for standard and rename entries', () => {
    const output = [
      ' M src/foundry/orchestrator.ts',
      '?? docs/FOUNDRY_TUI_GUIDE.md',
      'R  src/old.ts -> src/new.ts',
    ].join('\n');

    expect(parseGitStatusPaths(output)).toEqual([
      'src/foundry/orchestrator.ts',
      'docs/FOUNDRY_TUI_GUIDE.md',
      'src/new.ts',
    ]);
  });

  it('excludes generated artifacts without failing strict release scope', () => {
    const report = evaluateDeliverableScope([
      'src/foundry/orchestrator.ts',
      'docs/FOUNDRY_COWORK_INTEGRATION_GUIDE.md',
      'tests/unit/foundry/core/state-machine.test.ts',
      'dist/src/cli.js',
      'foundry.zip',
    ]);

    expect(report.passed).toBe(true);
    expect(report.included).toHaveLength(3);
    expect(report.excluded).toHaveLength(2);
    expect(report.blockingExcluded).toHaveLength(0);
    expect(report.excluded.map((item) => item.normalizedPath)).toEqual(['dist/src/cli.js', 'foundry.zip']);
  });

  it('fails in strict mode when non-source artifacts are detected', () => {
    const report = evaluateDeliverableScope(['assets/diagram.sketch']);

    expect(report.passed).toBe(false);
    expect(report.excluded).toHaveLength(1);
    expect(report.blockingExcluded).toHaveLength(1);
    expect(report.blockingExcluded[0].normalizedPath).toBe('assets/diagram.sketch');
  });

  it('runs in advisory mode without failing execution', () => {
    const report = evaluateDeliverableScope(['dist/src/cli.js'], { strict: false });

    expect(report.passed).toBe(true);
    expect(report.excluded).toHaveLength(1);
  });

  it('supports allow-list exceptions for explicitly approved artifacts', () => {
    const entry = classifyDeliverablePath('runs/custom/client-summary.pdf', ['runs/custom/']);

    expect(entry.included).toBe(true);
    expect(entry.reason).toBe('explicit allow-list exception');
  });
});
