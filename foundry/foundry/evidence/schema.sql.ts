import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core"
import { ulid } from "ulid"

export const evidence = sqliteTable("evidence", {
  id: text().primaryKey().$defaultFn(ulid),
  project_id: text().notNull(),
  phase: text().notNull(),
  gate: text(),
  task_id: text(),
  type: text().notNull(),
  name: text().notNull(),
  description: text(),
  file_path: text(),
  file_hash: text(),
  ci_run_id: text(),
  ci_url: text(),
  content_json: text(),
  content_summary: text(),
  created_at: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  created_by: text(),
  signature: text(),
})

export const evidenceTag = sqliteTable(
  "evidence_tag",
  {
    evidence_id: text()
      .notNull()
      .references(() => evidence.id),
    tag: text().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.evidence_id, table.tag] }),
  }),
)

export const gateEvaluation = sqliteTable("gate_evaluation", {
  id: text().primaryKey().$defaultFn(ulid),
  project_id: text().notNull(),
  phase: text().notNull(),
  gate: text().notNull(),
  result: text().notNull(),
  evaluated_at: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  evidence_ids: text().notNull(),
})
