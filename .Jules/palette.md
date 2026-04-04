# Palette's Journal

## 2026-02-14 - Adding Loading States to TUI
**Learning:** In TUI applications, long-running processes can be confusing if the input area remains active but unresponsive. Users might try to type commands that get ignored or buffered unexpectedly.
**Action:** Always provide a visual "disabled" or "loading" state for input areas during async operations, preferably with a spinner to indicate activity. I implemented this by replacing the `TextInput` with a `Spinner` and muted text when the agent is running.
