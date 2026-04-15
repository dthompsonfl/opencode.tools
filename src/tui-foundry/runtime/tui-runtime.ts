import { createWarmedUpBridge } from '../../foundry/cowork-bridge';
import { CoworkAdapter } from '../cowork/adapter';
import type { FoundryDispatch } from '../store/actions';
import { FoundryController } from './controllers/foundry-controller';
import { CoworkController } from './controllers/cowork-controller';

export class TuiRuntime {
  private static instance: TuiRuntime | null = null;

  public readonly bridge = createWarmedUpBridge();
  public readonly adapter = CoworkAdapter.getInstance();
  public readonly foundryController = new FoundryController();
  public readonly coworkController = new CoworkController(this.adapter);

  private initialized = false;

  public static getInstance(): TuiRuntime {
    if (!TuiRuntime.instance) {
      TuiRuntime.instance = new TuiRuntime();
    }

    return TuiRuntime.instance;
  }

  public static resetForTests(): void {
    TuiRuntime.instance = null;
  }

  public async initialize(dispatch: FoundryDispatch): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.adapter.initialize(dispatch);
    this.initialized = true;
  }

  public shutdown(): void {
    this.adapter.disconnect();
    this.initialized = false;
  }
}
