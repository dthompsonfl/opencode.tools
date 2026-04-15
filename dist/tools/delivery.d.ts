export declare function generateRunbook(architecture: any): Promise<{
    runbook: string;
}>;
export declare function generateNginxConfig(environmentMapping: {
    domain: string;
    port: number;
}[]): Promise<{
    config: string;
}>;
export declare function runSmoketest(url: string): Promise<{
    success: boolean;
    latency: number;
}>;
export declare function packageHandoff(artifacts: string[]): Promise<{
    handoffPackagePath: string;
}>;
//# sourceMappingURL=delivery.d.ts.map