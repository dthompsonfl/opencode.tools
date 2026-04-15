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
exports.AuditLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const redaction_1 = require("../security/redaction");
class AuditLogger {
    constructor(runDir) {
        this.logPath = path.join(runDir, 'toolcalls.jsonl');
    }
    async log(record) {
        const redactedRecord = (0, redaction_1.redactText)(JSON.stringify(record));
        const line = JSON.stringify(redactedRecord) + '\n';
        await fs.promises.appendFile(this.logPath, line, 'utf-8');
    }
    async readAll() {
        if (!fs.existsSync(this.logPath))
            return [];
        const content = await fs.promises.readFile(this.logPath, 'utf-8');
        return content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=audit.js.map