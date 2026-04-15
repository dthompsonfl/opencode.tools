"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const redaction_1 = require("../security/redaction");
class ArtifactManager {
    constructor(runDir) {
        this.runDir = runDir;
        this.artifactsDir = path.join(runDir, 'artifacts');
        if (!fs.existsSync(this.artifactsDir)) {
            fs.mkdirSync(this.artifactsDir, { recursive: true });
        }
    }
    async store(relativePath, content, type, metadata = {}) {
        const fullPath = path.join(this.artifactsDir, relativePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        // Redact content if it's text
        let contentToWrite = content;
        if (typeof content === 'string') {
            contentToWrite = (0, redaction_1.redactText)(content);
        }
        else if (Buffer.isBuffer(content) && type.startsWith('text/')) {
            contentToWrite = Buffer.from((0, redaction_1.redactText)(content.toString('utf-8')));
        }
        await fs.promises.writeFile(fullPath, contentToWrite);
        const hash = crypto.createHash('sha256').update(contentToWrite).digest('hex');
        const record = {
            id: crypto.randomUUID(),
            path: path.relative(this.runDir, fullPath),
            type,
            hash,
            createdAt: new Date().toISOString(),
            metadata
        };
        return record;
    }
    async get(relativePath) {
        const fullPath = path.join(this.artifactsDir, relativePath);
        return await fs.promises.readFile(fullPath);
    }
    exists(relativePath) {
        const fullPath = path.join(this.artifactsDir, relativePath);
        return fs.existsSync(fullPath);
    }
}
exports.ArtifactManager = ArtifactManager;
//# sourceMappingURL=artifacts.js.map