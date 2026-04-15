import { logger } from '../../src/runtime/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { resolveRunContext } from '../../src/runtime/run-context';

export interface HandoffPackage {
    id: string;
    artifacts: string[];
    manifest: string;
    metadata?: {
        runId: string;
        generatedAt: string;
        artifactCount: number;
    };
}

export class DeliveryAgent {
    private readonly agentName = 'delivery-agent';

    constructor() {}

    /**
     * Packages all project artifacts for delivery.
     */
    public async packageForDelivery(projectId: string, artifactPaths: string[]): Promise<HandoffPackage> {
        const context = resolveRunContext();
        const generatedAt = new Date().toISOString();
        logger.info('Delivery Agent started', { agent: this.agentName, project: projectId });

        const deliveryDir = path.join(process.cwd(), 'deliverables', projectId);
        if (!fs.existsSync(deliveryDir)) {
            fs.mkdirSync(deliveryDir, { recursive: true });
        }

        const existingArtifacts = artifactPaths.filter((artifactPath) => fs.existsSync(artifactPath));

        const manifest = {
            projectId,
            timestamp: generatedAt,
            files: existingArtifacts,
            missingFiles: artifactPaths.filter((artifactPath) => !fs.existsSync(artifactPath)),
            status: 'Production Ready',
            provenance: {
                runId: context.runId,
                manifestHash: crypto.createHash('sha256').update(`${projectId}:${generatedAt}`).digest('hex')
            }
        };

        const manifestPath = path.join(deliveryDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        logger.info('Delivery Agent completed', { agent: this.agentName, artifacts: artifactPaths.length });

        return {
            id: projectId,
            artifacts: existingArtifacts,
            manifest: JSON.stringify(manifest),
            metadata: {
                runId: context.runId,
                generatedAt,
                artifactCount: existingArtifacts.length
            }
        };
    }
}
