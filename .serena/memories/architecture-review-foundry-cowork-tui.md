# Architecture Review: Foundry-Cowork-Agents-TUI Integration

**Date:** 2025-02-15
**Scope:** Integration architecture between Foundry, Cowork, Agents, and TUI

## Key Findings Summary

| Aspect | Status | Risk Level |
|--------|--------|------------|
| Foundry → Cowork Initialization | ⚠️ Lazy, unvalidated | Medium |
| Real-Time Agent Collaboration | ❌ Not fully supported | High |
| Data Flow Completeness | ⚠️ One-way, no streaming | Medium |
| TUI Integration | ❌ Not integrated | High |
| State Management | ❌ Fragmented | High |
| Event System | ⚠️ Disconnected hubs | Medium |

## Critical Issues Identified

### 1. Foundry → Cowork Auto-Launch
- **Current:** Lazy initialization in `execute()` method
- **Problem:** Cold start latency, no pre-flight validation
- **Solution:** Add `warmup()` method, health checks, eager init option

### 2. Real-Time Agent Collaboration
- **Current:** EventBus and Blackboard exist as singletons but agents can't access them
- **Problem:** No bidirectional communication, agents can't subscribe to events
- **Solution:** Inject EventBus into agent execution context, add publish/subscribe to TaskContext

### 3. Data Flow Completeness
- **Current:** One-way request/response from Foundry → Cowork → Agents
- **Problem:** No real-time progress updates, no streaming, no intermediate evidence
- **Solution:** Add progress callbacks, streaming output, evidence chain integration

### 4. TUI Integration Gap
- **Current:** TUI has its own store, completely isolated
- **Problem:** No real-time workflow visibility, no agent monitoring
- **Solution:** TUI subscribes to EventBus, unified session state

### 5. Duplicate State Management
- **Current:** Three separate stores (Foundry, Cowork, TUI) + Blackboard
- **Problem:** No single source of truth, synchronization issues
- **Solution:** Unified state store with clear ownership boundaries

### 6. Missing Integration Points
- FoundryCollaborationHub ↔ Cowork EventBus: NOT CONNECTED
- TUI Store ↔ Cowork EventBus: NOT CONNECTED
- Foundry Evidence ↔ Blackboard: NOT CONNECTED

## Implementation Priority

### Phase 1: Critical (Week 1)
1. Create EventBusBridge between FoundryCollaborationHub and Cowork EventBus
2. Add TUI EventBus subscription for real-time updates
3. Inject EventBus into agent execution context
4. Add progress callbacks to AgentRunner

### Phase 2: High (Week 2)
5. Implement unified state management layer
6. Create AgentCoordinator for multi-agent sync
7. Add streaming output from AgentRunner
8. Connect TUI session store with Foundry checkpoint

### Phase 3: Medium (Week 3)
9. Add eager initialization and health checks
10. Implement agent-to-agent direct messaging
11. Create unified evidence/artifact store
12. Add transaction support for artifact updates

### Phase 4: Low (Week 4)
13. Add comprehensive metrics and monitoring
14. Implement advanced coordination patterns
15. Performance optimization

## Target Architecture

EventBus as central nervous system:
- All components publish/subscribe through EventBus
- Blackboard for shared state, EventBus for notifications
- TUI subscribes to EventBus for real-time updates
- Foundry publishes workflow events to EventBus
- Agents have EventBus access in execution context

## Expected Outcome

After implementation:
- ✅ Agents collaborate in real-time through EventBus
- ✅ TUI shows live workflow progress and agent activities
- ✅ Single source of truth for all state
- ✅ Bidirectional communication between all components
- ✅ Complete audit trail and evidence chain

## Full Documentation

Complete architecture review saved to: `docs/ARCHITECTURE_REVIEW_FOUNDRY_COWORK_TUI.md`

Includes:
- Detailed architecture diagrams
- Code analysis with specific file references
- Sequence diagrams for current and target states
- Security and compliance considerations
- Success metrics and performance targets
