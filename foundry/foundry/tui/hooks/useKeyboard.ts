import { useState, useCallback, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import { useStore, useDispatch, FoundryTUIState } from '../store/store.js';
import { Action, FocusArea } from '../types/index.js';
import { eventBus } from '../services/eventBus.js';

const focusOrder: FocusArea[] = ['chat', 'agents', 'gates', 'artifacts', 'team'];

export function useKeyboard(): { state: FoundryTUIState; dispatch: React.Dispatch<Action> } {
  const { state, dispatch } = useStore();
  const { exit } = useApp();
  const [focusIndex, setFocusIndex] = useState(0);

  useInput((input, key) => {
    // Global shortcuts
    if (key.ctrl) {
      switch (input.toLowerCase()) {
        case 'c':
          exit();
          return;
        case 'k':
          dispatch({ type: 'TOGGLE_HELP' });
          return;
        case 'n':
          // Create new project wizard
          eventBus.publish('project:create:wizard', {});
          return;
        case 'p':
          dispatch({ type: 'TOGGLE_PROJECT_SELECTOR' });
          return;
      }
    }

    // Tab to cycle focus
    if (key.tab) {
      const newIndex = key.shift
        ? (focusIndex - 1 + focusOrder.length) % focusOrder.length
        : (focusIndex + 1) % focusOrder.length;
      setFocusIndex(newIndex);
      dispatch({ type: 'SET_FOCUS', payload: focusOrder[newIndex] });
      return;
    }

    // Escape to close overlays
    if (key.escape) {
      if (state.isHelpVisible) {
        dispatch({ type: 'TOGGLE_HELP' });
        return;
      }
      if (state.isProjectSelectorVisible) {
        dispatch({ type: 'TOGGLE_PROJECT_SELECTOR' });
        return;
      }
    }

    // Command shortcuts
    if (input.startsWith('/')) {
      // Command input is handled by ChatInput component
      return;
    }
  });

  return { state, dispatch };
}
