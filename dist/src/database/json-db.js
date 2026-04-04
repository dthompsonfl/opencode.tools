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
exports.JsonDatabase = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class JsonDatabase {
    constructor(storageDir = 'data') {
        this.data = {};
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        this.dbPath = path.join(storageDir, 'research_db.json');
        this.ensureDbExists(storageDir);
        this.load();
    }
    ensureDbExists(storageDir) {
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }
        if (!fs.existsSync(this.dbPath)) {
            fs.writeFileSync(this.dbPath, JSON.stringify({}, null, 2));
        }
    }
    load() {
        try {
            const content = fs.readFileSync(this.dbPath, 'utf-8');
            this.data = JSON.parse(content);
        }
        catch (error) {
            console.error('Failed to load database:', error);
            this.data = {};
        }
    }
    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        }
        catch (error) {
            console.error('Failed to save database:', error);
        }
    }
    async saveResearch(record) {
        this.data[record.id] = record;
        this.save();
    }
    async getResearch(id) {
        if (!Object.prototype.hasOwnProperty.call(this.data, id)) {
            return null;
        }
        return this.data[id];
    }
    async getAllResearch() {
        return Object.values(this.data);
    }
    isValidResearchId(researchId) {
        // Allow only alphanumeric characters, underscores, and dashes
        return /^[a-zA-Z0-9_-]+$/.test(researchId);
    }
    async addFinding(researchId, finding) {
        if (!this.isValidResearchId(researchId)) {
            throw new Error('Invalid researchId');
        }
        const record = this.data[researchId];
        if (record) {
            record.findings.push(finding);
            this.save();
        }
        else {
            throw new Error(`Research record ${researchId} not found`);
        }
    }
    async updateStatus(researchId, status) {
        if (!this.isValidResearchId(researchId)) {
            throw new Error('Invalid researchId');
        }
        const record = this.data[researchId];
        if (record) {
            record.status = status;
            if (status === 'completed') {
                record.completedAt = new Date().toISOString();
            }
            this.save();
        }
        else {
            throw new Error(`Research record ${researchId} not found`);
        }
    }
}
exports.JsonDatabase = JsonDatabase;
//# sourceMappingURL=json-db.js.map