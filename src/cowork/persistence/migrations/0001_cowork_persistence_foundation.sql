CREATE TABLE IF NOT EXISTS cowork_workspace (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cowork_artifact (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cowork_feedback (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS cowork_evidence (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cowork_workspace_updated_at ON cowork_workspace (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cowork_artifact_updated_at ON cowork_artifact (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cowork_feedback_updated_at ON cowork_feedback (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cowork_evidence_updated_at ON cowork_evidence (updated_at DESC);

CREATE INDEX IF NOT EXISTS gin_cowork_workspace_payload ON cowork_workspace USING GIN (payload);
CREATE INDEX IF NOT EXISTS gin_cowork_artifact_payload ON cowork_artifact USING GIN (payload);
CREATE INDEX IF NOT EXISTS gin_cowork_feedback_payload ON cowork_feedback USING GIN (payload);
CREATE INDEX IF NOT EXISTS gin_cowork_evidence_payload ON cowork_evidence USING GIN (payload);
