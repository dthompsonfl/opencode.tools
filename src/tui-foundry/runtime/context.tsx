import * as React from 'react';
import { TuiRuntime } from './tui-runtime';

const RuntimeContext = React.createContext<TuiRuntime | null>(null);

export function RuntimeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const runtimeRef = React.useRef<TuiRuntime>(TuiRuntime.getInstance());
  return React.createElement(RuntimeContext.Provider, { value: runtimeRef.current }, children);
}

export function useTuiRuntime(): TuiRuntime {
  const runtime = React.useContext(RuntimeContext);
  if (!runtime) {
    throw new Error('useTuiRuntime must be used within RuntimeProvider');
  }

  return runtime;
}
