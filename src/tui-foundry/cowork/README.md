# Cowork Collaboration Integration for TUI-Foundry

This module provides comprehensive integration between the TUI (Terminal User Interface) and the Cowork multi-agent collaboration system. It enables real-time agent chat, collaboration requests, artifact sharing, and team management.

## Features

### 1. Real-time Agent Chat
- Agents appear in chat as participants
- Human can @mention agents to delegate tasks
- Agents can initiate conversations
- Conversation history persisted

### 2. Collaboration Requests
- Visual indicators for pending requests
- Approve/reject collaboration requests
- View request history
- Automated escalation paths

### 3. Artifact Sharing
- Share files in chat
- View workspace artifacts
- Link artifacts to messages
- Version control integration

### 4. Team Management
- View team roster in sidebar
- See agent status (idle, busy, offline)
- View agent capabilities
- Health monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TUI (React Ink)                              │
│                   ┌─────────────────┐                           │
│                   │   useTeam()     │                           │
│                   │useCollaboration()│                          │
│                   │  useArtifacts() │                           │
│                   │ useAgentActivity()│                          │
│                   └────────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼──────────┐      ┌──────────▼──────────┐
    │   CoworkAdapter    │      │    ChatBridge       │
    │                    │      │                     │
    │ ┌──────────────┐   │      │ ┌─────────────────┐ │
    │ │CoworkOrchestrator│ │      │ │@mention handling │ │
    │ │CollaborationProtocol│     │ │Context tracking │ │
    │ │TeamManager     │   │      │ │Message routing   │ │
    │ │EventBus        │   │      │ └─────────────────┘ │
    │ └──────────────┘   │      └─────────────────────┘
    └────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     Cowork Multi-Agent System                   │
│         (CoworkOrchestrator, CollaborationProtocol, etc.)       │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize the Integration

```typescript
import { setupCoworkIntegration } from './cowork';
import { useStore } from './store/store';

function App() {
  const { dispatch } = useStore();

  React.useEffect(() => {
    setupCoworkIntegration(dispatch, {
      adapter: { autoReconnect: true },
      chatBridge: { enableAgentMentions: true },
    });
  }, [dispatch]);

  return <YourApp />;
}
```

### 2. Use the Hooks in Components

```typescript
import { 
  useTeam, 
  useCollaboration, 
  useArtifacts,
  useAgentActivity 
} from './cowork';

function TeamDashboard() {
  const { currentTeam, currentTeamMembers } = useTeam();
  const { pendingRequests, respondToRequest } = useCollaboration();
  const { artifacts } = useArtifacts();
  const { activeAgents } = useAgentActivity();

  return (
    <Box>
      <Text>Team: {currentTeam?.name}</Text>
      <Text>Active Agents: {activeAgents.length}</Text>
      <Text>Pending Requests: {pendingRequests.length}</Text>
      <Text>Artifacts: {artifacts.length}</Text>
    </Box>
  );
}
```

### 3. Send Messages with @Mentions

```typescript
import { ChatBridge } from './cowork';

const chatBridge = ChatBridge.getInstance();

// Send a message that spawns an agent
await chatBridge.sendUserMessage(
  '@implementer Please fix the authentication bug in login.ts',
  { threadId: 'main', autoSpawnAgents: true }
);
```

## API Reference

### CoworkAdapter

The main bridge between TUI and Cowork systems.

```typescript
import { CoworkAdapter } from './cowork';

const adapter = CoworkAdapter.getInstance();

// Initialize
await adapter.initialize(dispatch);

// Spawn an agent
const result = await adapter.spawnAgent('implementer', 'Fix bug #123');

// Request collaboration
const response = await adapter.requestCollaboration(
  'fromAgent', 
  'toAgent', 
  'Review this code'
);

// Get team info
const team = adapter.getTeamForProject('project-1');
const health = adapter.getTeamHealth(team.id);

// Manage artifacts
const artifact = await adapter.updateArtifact(
  workspaceId,
  'readme.md',
  '# New Content',
  'user',
  'author'
);
```

### Hooks

#### useCoworkConnection
Monitor connection status to the Cowork system.

```typescript
const { 
  status, 
  isConnected, 
  reconnect,
  lastError 
} = useCoworkConnection();
```

#### useCoworkOrchestrator
Access to agent spawning and command execution.

```typescript
const { 
  isReady, 
  spawnAgent, 
  spawnAgents,
  executeCommand 
} = useCoworkOrchestrator();
```

#### useTeam
Access team and member information.

```typescript
const { 
  teams, 
  currentTeam, 
  currentTeamMembers,
  getTeamHealth,
  refresh 
} = useTeam();
```

#### useCollaboration
Manage collaboration requests and communications.

```typescript
const { 
  pendingRequests, 
  requestHelp, 
  respondToRequest,
  shareFinding,
  broadcast 
} = useCollaboration(agentId);
```

#### useArtifacts
Access and manage workspace artifacts.

```typescript
const { 
  artifacts, 
  workspaces, 
  activeWorkspace,
  getArtifact,
  updateArtifact,
  createWorkspace 
} = useArtifacts();
```

#### useAgentActivity
Monitor real-time agent activity.

```typescript
const { 
  agents, 
  activeAgents, 
  idleAgents, 
  errorAgents,
  getActivity 
} = useAgentActivity();
```

### ChatBridge

Bridge chat messages to Cowork collaboration.

```typescript
import { ChatBridge } from './cowork';

const chatBridge = ChatBridge.getInstance();

// Initialize
chatBridge.initialize(dispatch);

// Send messages
await chatBridge.sendUserMessage('Hello @implementer!');
await chatBridge.sendAgentMessage('implementer', 'Task completed!');

// Spawn agent via mention
await chatBridge.spawnAgentViaMention('implementer', 'Fix bug', {
  threadId: 'main',
  conversationHistory: [...]
});

// Manage context
const context = chatBridge.getContext('thread-1');
const history = chatBridge.getHistory('thread-1', 10);
```

## Event Integration

The CoworkAdapter automatically subscribes to Cowork events and dispatches them to the TUI store:

| Cowork Event | TUI Action |
|--------------|------------|
| `agent:start` | `UPSERT_AGENT` |
| `agent:complete` | `UPDATE_AGENT_STATUS` (completed) |
| `agent:error` | `UPDATE_AGENT_STATUS` (failed) + `APPEND_EXECUTION_ERROR` |
| `agent:progress` | `UPDATE_AGENT_STATUS` (progress) |
| `team:member:joined` | `UPSERT_TEAM_MEMBER` |
| `team:member:status_changed` | `UPDATE_MEMBER_STATUS` |
| `artifact:version:created` | `UPSERT_ARTIFACT` |
| `artifact:version:updated` | `UPSERT_ARTIFACT` |
| `collaboration:help:requested` | `ADD_FEED_ENTRY` |
| `workspace:conflict:detected` | `ADD_FEED_ENTRY` |
| `*` (catch-all) | `ADD_FEED_ENTRY` |

## Configuration

### Adapter Options

```typescript
interface CoworkAdapterOptions {
  autoReconnect?: boolean;        // Default: true
  reconnectDelayMs?: number;      // Default: 5000
  maxReconnectAttempts?: number;  // Default: 10
  defaultWorkspaceId?: string;    // Default: 'global'
  debug?: boolean;                // Default: false
}
```

### ChatBridge Options

```typescript
interface ChatBridgeOptions {
  enableAgentMentions?: boolean;      // Default: true
  enableAutoResponses?: boolean;      // Default: true
  enableContextTracking?: boolean;    // Default: true
  maxContextMessages?: number;        // Default: 50
  defaultResponseTimeout?: number;    // Default: 30000
  debug?: boolean;                    // Default: false
}
```

## Error Handling

The integration includes comprehensive error handling:

```typescript
const { status, lastError, reconnect } = useCoworkConnection();

if (status === 'error') {
  console.error('Connection error:', lastError);
  // Attempt reconnection
  await reconnect();
}
```

## Reconnection Logic

The adapter automatically handles reconnection:

1. Connection lost detected
2. Status changes to `reconnecting`
3. Attempts reconnection with exponential backoff
4. On success: Status changes to `connected`
5. On failure: Status changes to `error`, manual intervention required

## Testing

```typescript
import { 
  CoworkAdapter, 
  ChatBridge, 
  resetCoworkIntegration 
} from './cowork';

// Reset for clean test state
beforeEach(() => {
  resetCoworkIntegration();
});

// Test adapter
const adapter = CoworkAdapter.getInstance();
await adapter.initialize(mockDispatch);

// Test chat bridge
const chatBridge = ChatBridge.getInstance();
chatBridge.initialize(mockDispatch);
```

## Troubleshooting

### Connection Issues

1. Check EventBus health: `adapter.getConnectionStatus()`
2. Verify Cowork systems are running
3. Check logs for specific errors
4. Try manual reconnection: `await adapter.reconnect()`

### Agent Spawning Fails

1. Verify agent is registered: Check `TeamManager`
2. Check task format and parameters
3. Review orchestrator logs
4. Validate workspace permissions

### Events Not Received

1. Verify adapter is initialized
2. Check EventBus subscriptions
3. Review event payload format
4. Enable debug mode for detailed logging

## License

See main project LICENSE file.
