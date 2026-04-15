/**
 * Evidence Collector
 *
 * Automatic evidence collection from agent outputs, task completions, findings,
 * and state transitions. All evidence is cryptographically signed for integrity.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { CollaborativeWorkspace } from '../collaboration/collaborative-workspace';
import { EvidenceSigner, Evidence, SignedEvidence } from './signer';
import { createKeyStore, type KeyStore } from './key-store';

export interface EvidenceContext {
  projectId: string;
  taskId?: string;
  phase?: string;
  agentRole?: string;
}

export interface EvidenceFilter {
  projectId?: string;
  type?: string;
  source?: string;
  since?: number;
  until?: number;
  agentRole?: string;
}

export interface EvidenceManifest {
  packageId: string;
  createdAt: number;
  totalEvidence: number;
  evidenceIds: string[];
  filters: EvidenceFilter;
  signatures: {
    evidenceSignatures: number;
    packageSignature: string;
  };
}

export interface EvidencePackage {
  id: string;
  createdAt: number;
  evidence: SignedEvidence[];
  manifest: EvidenceManifest;
  signature: string;
}

export interface IntegrityReport {
  totalEvidence: number;
  validSignatures: number;
  invalidSignatures: number;
  missingEvidence: number;
  chainHash: string;
  isValid: boolean;
  details: Array<{
    evidenceId: string;
    isValid: boolean;
    error?: string;
  }>;
}

export class EvidenceCollector {
  private static instance: EvidenceCollector;
  private signer: EvidenceSigner;
  private keyStore: KeyStore;
  private collectedEvidence: Map<string, SignedEvidence> = new Map();
  private eventBus: EventBus;
  private workspace: CollaborativeWorkspace;
  private isCollecting: boolean = false;
  private eventListeners: Array<() => void> = [];

  private constructor() {
    this.signer = EvidenceSigner.getInstance();
    this.keyStore = createKeyStore();
    this.eventBus = EventBus.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
    
    // Initialize key store and sync with signer
    this.initializeKeys();
  }
  
  /**
   * Initialize key store and sync with EvidenceSigner
   */
  private initializeKeys(): void {
    try {
      const storedKey = this.keyStore.initialize();
      
      // Import the stored key into the signer
      if (storedKey && storedKey.privateKey && storedKey.publicKey) {
        this.signer.importKeyPair(storedKey.privateKey, storedKey.publicKey, storedKey.keyId);
        logger.info(`[EvidenceCollector] Initialized with key: ${storedKey.keyId}`);
      }
    } catch (error) {
      logger.error('[EvidenceCollector] Failed to initialize key store:', error);
    }
  }

  public static getInstance(): EvidenceCollector {
    if (!EvidenceCollector.instance) {
      EvidenceCollector.instance = new EvidenceCollector();
    }
    return EvidenceCollector.instance;
  }

  public static resetForTests(): void {
    if (!EvidenceCollector.instance) {
      return;
    }

    EvidenceCollector.instance.stopCollecting();
    EvidenceCollector.instance.collectedEvidence.clear();
    EvidenceCollector.instance = undefined as unknown as EvidenceCollector;
  }

  /**
   * Start collecting evidence from agent events
   */
  public startCollecting(): void {
    if (this.isCollecting) {
      logger.warn('[EvidenceCollector] Already collecting evidence');
      return;
    }

    this.isCollecting = true;

    // Listen to agent completion events
    const agentCompleteUnsub = this.eventBus.subscribe('agent:complete', (payload) => {
      const data = payload as {
        agentId: string;
        result: unknown;
        projectId?: string;
        taskId?: string;
      };

      if (data.projectId) {
        this.collectFromAgentOutput(
          data.agentId,
          data.result,
          {
            projectId: data.projectId,
            taskId: data.taskId
          }
        );
      }
    });

    // Listen to task completion events
    const taskCompleteUnsub = this.eventBus.subscribe('task:completed', (payload) => {
      const data = payload as {
        taskId: string;
        result: unknown;
        projectId?: string;
      };

      if (data.projectId) {
        this.collectFromTaskCompletion(data.taskId, data.result, data.projectId);
      }
    });

    // Listen to finding events
    const findingUnsub = this.eventBus.subscribe('monitoring:finding', (payload) => {
      const finding = payload as {
        id: string;
        type: string;
        severity: string;
        title: string;
        description: string;
        projectId?: string;
      };

      if (finding.projectId) {
        this.collectFromFinding(finding, finding.projectId);
      }
    });

    // Listen to state transition events
    const stateTransitionUnsub = this.eventBus.subscribe('state:transition', (payload) => {
      const transition = payload as {
        fromState: string;
        toState: string;
        projectId?: string;
        metadata?: Record<string, unknown>;
      };

      if (transition.projectId) {
        this.collectFromStateTransition(transition, transition.projectId);
      }
    });

    // Store unsubscribe functions
    this.eventListeners = [
      agentCompleteUnsub,
      taskCompleteUnsub,
      findingUnsub,
      stateTransitionUnsub
    ];

    logger.info('[EvidenceCollector] Started collecting evidence from agent events');
  }

  /**
   * Stop collecting evidence
   */
  public stopCollecting(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;

    // Unsubscribe all listeners
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners = [];

    logger.info('[EvidenceCollector] Stopped collecting evidence');
  }

  /**
   * Collect evidence from agent output
   */
  public collectFromAgentOutput(
    agentId: string,
    output: unknown,
    context: EvidenceContext
  ): SignedEvidence {
    const evidence: Evidence = {
      id: `evidence-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent_output',
      source: agentId,
      projectId: context.projectId,
      timestamp: Date.now(),
      content: output,
      metadata: {
        taskId: context.taskId,
        phase: context.phase,
        agentRole: context.agentRole
      }
    };

    return this.collectAndStore(evidence);
  }

  /**
   * Collect evidence from task completion
   */
  public collectFromTaskCompletion(
    taskId: string,
    result: unknown,
    projectId: string
  ): SignedEvidence {
    const evidence: Evidence = {
      id: `evidence-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'task_completion',
      source: 'task-router',
      projectId,
      timestamp: Date.now(),
      content: result,
      metadata: { taskId }
    };

    return this.collectAndStore(evidence);
  }

  /**
   * Collect evidence from a finding
   */
  public collectFromFinding(
    finding: {
      id: string;
      type: string;
      severity: string;
      title: string;
      description: string;
    },
    projectId: string
  ): SignedEvidence {
    const evidence: Evidence = {
      id: `evidence-finding-${finding.id}`,
      type: 'finding',
      source: 'monitoring-agent',
      projectId,
      timestamp: Date.now(),
      content: finding,
      metadata: {
        findingId: finding.id,
        findingType: finding.type,
        severity: finding.severity
      }
    };

    return this.collectAndStore(evidence);
  }

  /**
   * Collect evidence from state transition
   */
  public collectFromStateTransition(
    transition: {
      fromState: string;
      toState: string;
      metadata?: Record<string, unknown>;
    },
    projectId: string
  ): SignedEvidence {
    const evidence: Evidence = {
      id: `evidence-transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'state_transition',
      source: 'state-machine',
      projectId,
      timestamp: Date.now(),
      content: transition,
      metadata: transition.metadata || {}
    };

    return this.collectAndStore(evidence);
  }

  /**
   * Collect and store evidence with signing
   */
  private collectAndStore(evidence: Evidence): SignedEvidence {
    const signedEvidence = this.signer.signEvidence(evidence, 'evidence-collector');
    this.collectedEvidence.set(signedEvidence.id, signedEvidence);

    // Store in workspace as artifact
    const workspaces = this.workspace.getWorkspacesForProject(evidence.projectId);
    if (workspaces.length > 0) {
      const activeWorkspace = workspaces.find(w => w.status === 'active') || workspaces[0];
      this.workspace.updateArtifact(
        activeWorkspace.id,
        `evidence/${evidence.type}/${evidence.id}`,
        signedEvidence,
        'evidence-collector',
        evidence.source,
        {
          changeDescription: `Collected evidence: ${evidence.type}`,
          metadata: { evidenceType: evidence.type }
        }
      );
    }

    logger.debug(`[EvidenceCollector] Collected and signed evidence ${signedEvidence.id}`);

    // Emit collection event
    this.eventBus.publish('evidence:collected', {
      evidenceId: signedEvidence.id,
      type: signedEvidence.type,
      projectId: signedEvidence.projectId,
      timestamp: signedEvidence.signedAt
    });

    return signedEvidence;
  }

  /**
   * Get evidence by ID
   */
  public getEvidence(id: string): SignedEvidence | undefined {
    return this.collectedEvidence.get(id);
  }

  /**
   * Get all evidence for a project
   */
  public getEvidenceForProject(projectId: string): SignedEvidence[] {
    return Array.from(this.collectedEvidence.values())
      .filter(e => e.projectId === projectId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get evidence for compliance framework
   */
  public getEvidenceForCompliance(framework: string): SignedEvidence[] {
    return Array.from(this.collectedEvidence.values())
      .filter(e => {
        // Filter by evidence types relevant to compliance
        const complianceTypes = ['finding', 'state_transition', 'task_completion'];
        return complianceTypes.includes(e.type) ||
          (e.metadata && e.metadata.complianceFramework === framework);
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export evidence package with filter
   */
  public exportEvidencePackage(filter: EvidenceFilter): EvidencePackage {
    const filteredEvidence = this.filterEvidence(filter);

    const packageId = `package-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();

    // Create package manifest
    const manifest: EvidenceManifest = {
      packageId,
      createdAt,
      totalEvidence: filteredEvidence.length,
      evidenceIds: filteredEvidence.map(e => e.id),
      filters: filter,
      signatures: {
        evidenceSignatures: filteredEvidence.length,
        packageSignature: '' // Will be set below
      }
    };

    // Sign the manifest
    const manifestHash = this.signer.hashContent(manifest);
    const packageSignature = this.signManifest(manifestHash);
    manifest.signatures.packageSignature = packageSignature;

    const packageData: EvidencePackage = {
      id: packageId,
      createdAt,
      evidence: filteredEvidence,
      manifest,
      signature: packageSignature
    };

    logger.info(`[EvidenceCollector] Exported evidence package ${packageId} with ${filteredEvidence.length} items`);

    // Emit export event
    this.eventBus.publish('evidence:package_exported', {
      packageId,
      evidenceCount: filteredEvidence.length,
      filters: filter,
      timestamp: createdAt
    });

    return packageData;
  }

  /**
   * Verify the integrity of all collected evidence
   */
  public verifyEvidenceChain(): IntegrityReport {
    const evidence = Array.from(this.collectedEvidence.values());
    const details: IntegrityReport['details'] = [];
    let validSignatures = 0;
    let invalidSignatures = 0;

    for (const e of evidence) {
      const isValid = this.signer.verifySignature(e);
      details.push({
        evidenceId: e.id,
        isValid,
        error: isValid ? undefined : 'Invalid signature'
      });

      if (isValid) {
        validSignatures++;
      } else {
        invalidSignatures++;
      }
    }

    // Calculate chain hash
    const sortedIds = evidence
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => e.id)
      .join(',');
    const chainHash = this.signer.hashContent(sortedIds);

    const report: IntegrityReport = {
      totalEvidence: evidence.length,
      validSignatures,
      invalidSignatures,
      missingEvidence: 0,
      chainHash,
      isValid: invalidSignatures === 0,
      details
    };

    logger.info(`[EvidenceCollector] Verified evidence chain: ${validSignatures}/${evidence.length} valid`);

    return report;
  }

  /**
   * Get collection status
   */
  public getStatus(): {
    isCollecting: boolean;
    totalEvidence: number;
    hasSignerKeys: boolean;
  } {
    return {
      isCollecting: this.isCollecting,
      totalEvidence: this.collectedEvidence.size,
      hasSignerKeys: this.signer.hasKeys()
    };
  }

  /**
   * Filter evidence based on criteria
   */
  private filterEvidence(filter: EvidenceFilter): SignedEvidence[] {
    return Array.from(this.collectedEvidence.values())
      .filter(e => {
        if (filter.projectId && e.projectId !== filter.projectId) return false;
        if (filter.type && e.type !== filter.type) return false;
        if (filter.source && e.source !== filter.source) return false;
        if (filter.since && e.timestamp < filter.since) return false;
        if (filter.until && e.timestamp > filter.until) return false;
        if (filter.agentRole && e.metadata?.agentRole !== filter.agentRole) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Sign the manifest using the key store
   */
  private signManifest(manifestHash: string): string {
    const signResult = this.keyStore.signPayload(manifestHash);
    
    if (!signResult) {
      logger.error('[EvidenceCollector] Failed to sign manifest - using fallback');
      // Fallback to placeholder only if key store fails
      return `signed-fallback-${manifestHash}`;
    }
    
    return `${signResult.keyId}:${signResult.signature}`;
  }

  /**
   * Clear all evidence (for testing)
   */
  public clear(): void {
    EvidenceCollector.resetForTests();
    logger.warn('[EvidenceCollector] All evidence cleared');
  }
}

export default EvidenceCollector;
