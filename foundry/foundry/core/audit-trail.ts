import { createHash, randomBytes } from "crypto";
import type { Database } from "@/storage/db";

export interface AuditEvent {
  type: string;
  actor: string;
  action: string;
  resource: string;
  projectId: string;
  phase: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface AuditRecord {
  id: string;
  event: AuditEvent;
  evidenceHash: string;
  previousHash: string;
  chainIndex: number;
  signature: string;
}

export interface AgentAction {
  agentId: string;
  action: string;
  taskId?: string;
  projectId?: string;
  phase?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  success: boolean;
  evidenceIds?: string[];
}

export class AuditTrail {
  private db: Database;
  private signingKey: string;
  private lastHash: string = "0".repeat(64);

  constructor(db: Database, signingKey?: string) {
    this.db = db;
    this.signingKey = signingKey || this.generateKey();
  }

  private generateKey(): string {
    return randomBytes(32).toString("hex");
  }

  async record(event: AuditEvent): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: this.generateId(),
      event,
      evidenceHash: this.hashEvidence(event),
      previousHash: this.lastHash,
      chainIndex: await this.getNextChainIndex(),
      signature: "",
    };

    record.signature = this.signRecord(record);
    this.lastHash = this.hashRecord(record);

    await this.persist(record);
    return record;
  }

  async recordAgentAction(action: AgentAction): Promise<AuditRecord> {
    return this.record({
      type: "AGENT_ACTION",
      actor: action.agentId,
      action: action.action,
      resource: action.taskId || "unknown",
      projectId: action.projectId || "",
      phase: action.phase || "idle",
      metadata: {
        input: action.input,
        output: action.output,
        duration: action.duration,
        success: action.success,
        evidenceIds: action.evidenceIds,
      },
      timestamp: Date.now(),
    });
  }

  async recordStateTransition(transition: {
    from: string;
    to: string;
    event: string;
    actor: string;
    evidenceIds: string[];
    timestamp: number;
    projectId: string;
  }): Promise<AuditRecord> {
    return this.record({
      type: "STATE_TRANSITION",
      actor: transition.actor,
      action: transition.event,
      resource: `${transition.from}_to_${transition.to}`,
      projectId: transition.projectId,
      phase: transition.to,
      metadata: {
        from: transition.from,
        to: transition.to,
        evidenceIds: transition.evidenceIds,
      },
      timestamp: transition.timestamp,
    });
  }

  private hashEvidence(event: AuditEvent): string {
    return createHash("sha256")
      .update(JSON.stringify(event.metadata))
      .digest("hex");
  }

  private hashRecord(record: AuditRecord): string {
    const data = `${record.id}:${record.event.timestamp}:${record.evidenceHash}:${record.previousHash}`;
    return createHash("sha256").update(data).digest("hex");
  }

  private signRecord(record: AuditRecord): string {
    const data = `${record.id}:${record.evidenceHash}:${record.previousHash}`;
    return createHash("sha256").update(data + this.signingKey).digest("hex");
  }

  private async getNextChainIndex(): Promise<number> {
    return 0;
  }

  private async persist(record: AuditRecord): Promise<void> {
    await this.db.$client.execute({
      sql: `INSERT INTO audit_trail (id, event_type, actor, action, resource, project_id, phase, metadata, evidence_hash, previous_hash, chain_index, signature, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING`,
      args: [
        record.id,
        record.event.type,
        record.event.actor,
        record.event.action,
        record.event.resource,
        record.event.projectId,
        record.event.phase,
        JSON.stringify(record.event.metadata),
        record.evidenceHash,
        record.previousHash,
        record.chainIndex,
        record.signature,
        record.event.timestamp,
      ],
    });
  }

  private generateId(): string {
    return `${Date.now()}-${randomBytes(4).toString("hex")}`;
  }
}
