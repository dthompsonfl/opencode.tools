/**
 * Foundry TUI - Keyboard Shortcuts Hook
 * Handles all keyboard navigation and shortcuts
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useInput } from 'ink';
import type { FoundryScreen, FoundryState } from '../types';
import { useStore } from '../store/store';
import { SCREEN_ORDER } from '../types';

export function useKeyboard(): void {
  const { state, dispatch } = useStore();
  const { exit } = useApp();
  const [focusIndex, setFocusIndex] = useState(0);

  useInput((input, key) => {
    // Global shortcuts with Ctrl
    if (key.ctrl) {
      switch (input.toLowerCase()) {
        case 'c':
          exit();
          return;
        case 'h':
        case 'k':
          dispatch({ type: 'TOGGLE_HELP' });
          return;
        case 'n':
          dispatch({ type: 'SET_SCREEN', screen: 'project' });
          return;
        case 'q':
          exit();
          return;
      }
    }

    // Number keys for screen switching (1-6)
    if (!key.ctrl && !key.meta && input >= '1' && input <= '6') {
      const index = parseInt(input, 10) - 1;
      if (index >= 0 && index < SCREEN_ORDER.length) {
        dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[index] });
      }
      return;
    }

    // Arrow keys for navigation
    if (key.leftArrow) {
      const currentIndex = SCREEN_ORDER.indexOf(state.screen);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : SCREEN_ORDER.length - 1;
      dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[newIndex] });
      return;
    }

    if (key.rightArrow) {
      const currentIndex = SCREEN_ORDER.indexOf(state.screen);
      const newIndex = currentIndex < SCREEN_ORDER.length - 1 ? currentIndex + 1 : 0;
      dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[newIndex] });
      return;
    }

    // Tab for cycling focus areas
    if (key.tab) {
      const focusAreas = ['nav', 'main', 'sidebar', 'input'] as const;
      const currentIdx = focusAreas.indexOf(state.navigation.focusedPanel);
      const nextIdx = key.shift
        ? (currentIdx - 1 + focusAreas.length) % focusAreas.length
        : (currentIdx + 1) % focusAreas.length;
      dispatch({ type: 'SET_FOCUSED_PANEL', panel: focusAreas[nextIdx] });
      return;
    }

    // Escape to close overlays
    if (key.escape) {
      if (state.isHelpVisible) {
        dispatch({ type: 'TOGGLE_HELP' });
        return;
      }
      // Navigate back
      dispatch({ type: 'NAVIGATE_BACK' });
      return;
    }

    // Enter on navigation
    if (key.return && state.navigation.focusedPanel === 'nav') {
      // Handle nav selection
      return;
    }
  });
}

/**
 * Hook for managing focus cycling within a component
 */
export function useFocusCycle(itemCount: number): [number, (index: number) => void] {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
    } else if (key.downArrow) {
      setFocusedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
    } else if (input >= '1' && input <= '9') {
      const index = parseInt(input, 10) - 1;
      if (index < itemCount) {
        setFocusedIndex(index);
      }
    }
  });

  return [focusedIndex, setFocusedIndex];
}

/**
 * Hook for command input handling
 */
export function useCommandInput(
  onSubmit: (command: string) => void
): {
  value: string;
  setValue: (value: string) => void;
  history: string[];
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
} {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((input, key) => {
    if (key.return && value.trim()) {
      onSubmit(value.trim());
      setHistory((prev) => [value.trim(), ...prev].slice(0, 50));
      setValue('');
      setHistoryIndex(-1);
    } else if (key.upArrow && history.length > 0) {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setValue(history[newIndex] || '');
    } else if (key.downArrow && historyIndex >= 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setValue(newIndex >= 0 ? history[newIndex] : '');
    }
  });

  return { value, setValue, history, historyIndex, setHistoryIndex };
}
