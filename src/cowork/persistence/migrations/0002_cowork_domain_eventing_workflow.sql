CREATE TABLE IF NOT EXISTS cowork_workspace_state (
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  artifact_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_cowork_workspace_state_project
  ON cowork_workspace_state (tenant_id, project_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cowork_blackboard_entry (
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  source TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, workspace_id, artifact_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cowork_blackboard_entry_artifact_id
  ON cowork_blackboard_entry (tenant_id, artifact_id);

CREATE INDEX IF NOT EXISTS idx_cowork_blackboard_entry_workspace
  ON cowork_blackboard_entry (tenant_id, workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS gin_cowork_blackboard_entry_payload
  ON cowork_blackboard_entry USING GIN (payload);

CREATE TABLE IF NOT EXISTS cowork_blackboard_feedback (
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  feedback_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  source_actor TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, workspace_id, feedback_id)
);

CREATE INDEX IF NOT EXISTS idx_cowork_blackboard_feedback_target
  ON cowork_blackboard_feedback (tenant_id, workspace_id, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cowork_workspace_snapshot (
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  snapshot_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, workspace_id, snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_cowork_workspace_snapshot_created
  ON cowork_workspace_snapshot (tenant_id, workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cowork_event_log (
  version BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cowork_event_log_tenant_version
  ON cowork_event_log (tenant_id, version ASC);

CREATE INDEX IF NOT EXISTS idx_cowork_event_log_aggregate
  ON cowork_event_log (tenant_id, aggregate_type, aggregate_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_cowork_event_log_event_type
  ON cowork_event_log (tenant_id, event_type, version DESC);

CREATE TABLE IF NOT EXISTS cowork_event_consumer_checkpoint (
  tenant_id TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  last_event_version BIGINT NOT NULL DEFAULT 0,
  last_event_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, consumer_id)
);

CREATE TABLE IF NOT EXISTS cowork_workflow_definition (
  tenant_id TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  trigger_event_type TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, definition_id, version)
);

CREATE INDEX IF NOT EXISTS idx_cowork_workflow_definition_trigger
  ON cowork_workflow_definition (tenant_id, trigger_event_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS cowork_workflow_instance (
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  definition_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  current_step_id TEXT,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_event_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_cowork_workflow_instance_status
  ON cowork_workflow_instance (tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS cowork_workflow_history (
  tenant_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  history_id TEXT NOT NULL,
  step_id TEXT,
  transition TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, history_id)
);

CREATE INDEX IF NOT EXISTS idx_cowork_workflow_history_instance
  ON cowork_workflow_history (tenant_id, instance_id, recorded_at DESC);
