import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Panel } from '../components/common';
import { useLLM } from '../hooks/useLLM';
import { useStore } from '../store/store';
import type { LLMProvider } from '../types';

const PROVIDER_ORDER: LLMProvider[] = ['openai', 'anthropic', 'google', 'azure', 'local', 'custom'];
type SettingsSection = 'llm' | 'runtime';
type EditableField = 'apiKey' | 'baseUrl' | 'model' | 'maxTokens';

export function SettingsScreen(): React.ReactElement {
  const { state, dispatch } = useStore();
  const llm = useLLM();
  const [focusedSection, setFocusedSection] = React.useState<SettingsSection>('llm');
  const [editingField, setEditingField] = React.useState<EditableField | null>(null);
  const [editBuffer, setEditBuffer] = React.useState('');

  const beginEdit = (field: EditableField): void => {
    setEditingField(field);
    if (field === 'apiKey') {
      setEditBuffer(state.llmConfig.apiKey ?? '');
      return;
    }

    if (field === 'baseUrl') {
      setEditBuffer(state.llmConfig.baseUrl ?? '');
      return;
    }

    if (field === 'model') {
      setEditBuffer(state.llmConfig.model);
      return;
    }

    setEditBuffer(state.llmConfig.maxTokens ? String(state.llmConfig.maxTokens) : '');
  };

  const applyEdit = (): void => {
    if (!editingField) {
      return;
    }

    const value = editBuffer.trim();

    if (editingField === 'apiKey') {
      llm.updateApiKey(value);
      if (state.llmConfig.provider === 'openai') {
        process.env.OPENAI_API_KEY = value;
      }
      setEditingField(null);
      setEditBuffer('');
      return;
    }

    if (editingField === 'baseUrl') {
      llm.updateBaseUrl(value);
      setEditingField(null);
      setEditBuffer('');
      return;
    }

    if (editingField === 'model') {
      if (value.length > 0) {
        llm.updateModel(value);
        if (state.llmConfig.provider === 'openai') {
          process.env.OPENAI_MODEL = value;
        }
      }
      setEditingField(null);
      setEditBuffer('');
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      llm.updateMaxTokens(parsed);
    }
    setEditingField(null);
    setEditBuffer('');
  };

  useInput((input, key) => {
    if (editingField) {
      if (key.escape) {
        setEditingField(null);
        setEditBuffer('');
        return;
      }

      if (key.return) {
        applyEdit();
        return;
      }

      if (key.backspace || key.delete) {
        setEditBuffer((current) => current.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow && input.length === 1) {
        setEditBuffer((current) => `${current}${input}`);
      }
      return;
    }

    if (key.tab) {
      setFocusedSection((current) => (current === 'llm' ? 'runtime' : 'llm'));
      return;
    }

    if (focusedSection === 'llm') {
      const lower = input.toLowerCase();

      if (lower === 'p') {
        const currentIndex = PROVIDER_ORDER.indexOf(state.llmConfig.provider);
        const next = PROVIDER_ORDER[(currentIndex + 1) % PROVIDER_ORDER.length];
        llm.updateProvider(next);
        process.env.COWORK_LLM_PROVIDER = next;
        return;
      }

      if (lower === 'm') {
        const models = llm.availableModels;
        if (models.length === 0) {
          return;
        }
        const currentIndex = models.indexOf(state.llmConfig.model);
        const nextModel = models[(currentIndex + 1) % models.length];
        llm.updateModel(nextModel);
        process.env.OPENAI_MODEL = nextModel;
        return;
      }

      if (lower === 'e') {
        llm.toggleEnabled();
        return;
      }

      if (lower === 'k') {
        beginEdit('apiKey');
        return;
      }

      if (lower === 'u') {
        beginEdit('baseUrl');
        return;
      }

      if (lower === 'x') {
        beginEdit('model');
        return;
      }

      if (lower === 'z') {
        beginEdit('maxTokens');
        return;
      }

      if (lower === 'v') {
        void llm.testConnection();
        return;
      }

      if (key.leftArrow || key.rightArrow) {
        const delta = key.rightArrow ? 0.1 : -0.1;
        const next = Math.max(0, Math.min(2, Number((state.llmConfig.temperature + delta).toFixed(1))));
        llm.updateTemperature(next);
      }
      return;
    }

    const lower = input.toLowerCase();

    if (lower === 'n') {
      dispatch({ type: 'UPDATE_SETTINGS', settings: { showNotifications: !state.settings.showNotifications } });
      return;
    }

    if (lower === 'a') {
      dispatch({ type: 'UPDATE_SETTINGS', settings: { autoScroll: !state.settings.autoScroll } });
      return;
    }

    if (lower === 'c') {
      dispatch({ type: 'UPDATE_SETTINGS', settings: { compactMode: !state.settings.compactMode } });
      return;
    }

    if (lower === 't') {
      const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
      const index = themes.indexOf(state.settings.theme);
      dispatch({ type: 'UPDATE_SETTINGS', settings: { theme: themes[(index + 1) % themes.length] } });
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1 },
    React.createElement(
      Box,
      { marginBottom: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Settings Command Center'),
      React.createElement(
        Text,
        null,
        '[Tab] Section | LLM:[P provider][M cycle model][X custom model][K api key][U base url][Z max tokens][E enable][←/→ temp][V test] | Runtime:[N/A/C/T]'
      ),
      editingField
        ? React.createElement(Text, { color: 'yellow' }, `Editing ${editingField}: ${editBuffer}_  (Enter=save Esc=cancel)`)
        : null,
    ),
    React.createElement(
      Box,
      { flexDirection: 'row', flexGrow: 1 },
      React.createElement(
        Box,
        { width: '55%', marginRight: 1 },
        React.createElement(
          Panel,
          { title: `LLM Controls (${focusedSection === 'llm' ? 'focused' : 'idle'})` },
          React.createElement(Text, null, `Provider: ${state.llmConfig.provider}`),
          React.createElement(Text, null, `Model: ${state.llmConfig.model}`),
          React.createElement(Text, null, `Temperature: ${state.llmConfig.temperature.toFixed(1)}`),
          React.createElement(Text, null, `Max tokens: ${state.llmConfig.maxTokens ?? 'not set'}`),
          React.createElement(Text, null, `Enabled: ${state.llmConfig.enabled ? 'yes' : 'no'}`),
          React.createElement(Text, null, `Base URL: ${state.llmConfig.baseUrl ?? 'provider default'}`),
          React.createElement(Text, null, `API key configured: ${state.llmConfig.apiKey ? 'yes' : 'no'}`),
          React.createElement(Text, null, `Provider supports base URL: ${llm.providerInfo.supportsBaseUrl ? 'yes' : 'no'}`),
          llm.isTesting ? React.createElement(Text, { color: 'yellow' }, 'Connection test: running...') : null,
          llm.testResult
            ? React.createElement(
                Text,
                { color: llm.testResult.success ? 'green' : 'red' },
                `Connection test: ${llm.testResult.message}`,
              )
            : null,
        ),
      ),
      React.createElement(
        Box,
        { width: '45%' },
        React.createElement(
          Panel,
          { title: `Runtime Controls (${focusedSection === 'runtime' ? 'focused' : 'idle'})` },
          React.createElement(Text, null, `Theme: ${state.settings.theme}`),
          React.createElement(Text, null, `Notifications: ${state.settings.showNotifications ? 'on' : 'off'}`),
          React.createElement(Text, null, `Auto scroll: ${state.settings.autoScroll ? 'on' : 'off'}`),
          React.createElement(Text, null, `Compact mode: ${state.settings.compactMode ? 'on' : 'off'}`),
          React.createElement(Text, null, `Connection status: ${state.connection}`),
          React.createElement(Text, null, `Active project: ${state.activeProjectId ?? 'none'}`),
          React.createElement(Text, null, `Available models: ${llm.availableModels.join(', ') || 'n/a'}`),
        ),
      ),
    ),
  );
}
