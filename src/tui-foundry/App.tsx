import React from 'react';
import { useInput } from 'ink';
import { useStore } from './store/store';
import { MainLayout } from './components/layout';
import { SCREEN_ORDER } from './types';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { AgentHubScreen } from './screens/AgentHubScreen';
import { ExecutionScreen } from './screens/ExecutionScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WorkspacesScreen } from './screens/WorkspacesScreen';
import { WorkspaceDetailScreen } from './screens/WorkspaceDetailScreen';
import { AuditScreen } from './screens/AuditScreen';

export function App(): React.ReactElement {
  const { state, dispatch } = useStore();

  useInput((input, key) => {
    if (!key.ctrl && !key.meta && /^\d$/.test(input)) {
      const index = parseInt(input, 10) - 1;
      if (index >= 0 && index < SCREEN_ORDER.length) {
        dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[index] });
      }
      return;
    }

    if (key.leftArrow || key.rightArrow) {
      const currentIndex = SCREEN_ORDER.indexOf(state.screen);
      const offset = key.leftArrow ? -1 : 1;
      const nextIndex = (currentIndex + offset + SCREEN_ORDER.length) % SCREEN_ORDER.length;
      dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[nextIndex] });
      return;
    }

    if (key.escape) {
      dispatch(state.isHelpVisible ? { type: 'TOGGLE_HELP' } : { type: 'NAVIGATE_BACK' });
    }
  });

  const screenMap = {
    dashboard: React.createElement(DashboardScreen),
    project: React.createElement(ProjectScreen),
    agentHub: React.createElement(AgentHubScreen),
    execution: React.createElement(ExecutionScreen),
    chat: React.createElement(ConversationScreen),
    settings: React.createElement(SettingsScreen),
    workspaces: React.createElement(WorkspacesScreen),
    workspace: React.createElement(WorkspaceDetailScreen),
    audit: React.createElement(AuditScreen),
  } as const;

  return React.createElement(MainLayout, null, screenMap[state.screen] ?? React.createElement(DashboardScreen));
}
