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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const archiver_1 = __importDefault(require("archiver"));
class Exporter {
    constructor(artifactManager) {
        this.artifactManager = artifactManager;
    }
    async createBundle(runId, outputDir) {
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        const zipPath = path.join(outputDir, `run-${runId}-bundle.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 }
        });
        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            archive.on('error', (err) => reject(err));
            archive.pipe(output);
            resolve(zipPath);
        });
    }
    async zipDirectory(sourceDir, outPath) {
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);
        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err) => reject(err))
                .pipe(stream);
            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
}
exports.Exporter = Exporter;
//# sourceMappingURL=exporter.js.map