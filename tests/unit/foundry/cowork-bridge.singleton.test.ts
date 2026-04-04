import { createWarmedUpBridge, resetWarmedUpBridgeForTests } from '../../../src/foundry/cowork-bridge';
import { CoworkOrchestrator } from '../../../src/cowork/orchestrator/cowork-orchestrator';

describe('Foundry/Cowork singleton wiring', () => {
  afterEach(() => {
    resetWarmedUpBridgeForTests();
    CoworkOrchestrator.resetInstanceForTests();
  });

  it('reuses warmed bridge singleton instance', () => {
    const bridgeA = createWarmedUpBridge();
    const bridgeB = createWarmedUpBridge();

    expect(bridgeA).toBe(bridgeB);
  });

  it('reuses CoworkOrchestrator singleton', () => {
    const orchestratorA = CoworkOrchestrator.getInstance();
    const orchestratorB = CoworkOrchestrator.getInstance();

    expect(orchestratorA).toBe(orchestratorB);
    expect(createWarmedUpBridge().getOrchestrator()).toBe(orchestratorA);
  });
});
