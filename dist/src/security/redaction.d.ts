export interface RedactionResult {
    redactedText: string;
    redactions: Array<{
        type: string;
        count: number;
    }>;
}
export declare function redactText(text: string): string;
export declare function redactTextStructured(text: string): RedactionResult;
//# sourceMappingURL=redaction.d.ts.map