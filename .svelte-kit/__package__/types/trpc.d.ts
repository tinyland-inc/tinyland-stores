/**
 * tRPC client interface types.
 *
 * Replaces direct imports from $lib/trpc/client.
 * Consumers inject their tRPC client instance via configuration.
 */
/** TraceQL query input parameters. */
export interface TraceQLQueryInput {
    query: string;
    startTime: Date;
    endTime: Date;
    limit: number;
}
/** tRPC TraceQL response. */
export interface TRPCTraceQLResponse {
    spans: unknown[];
    aggregations: {
        attributeName?: string;
        values?: {
            value?: string;
            count?: number;
        }[];
    }[];
    metadata: {
        executionTimeMs: number;
        resultCount: number;
        truncated: boolean;
        query: string;
        timeRange: {
            startTime: Date;
            endTime: Date;
        };
    };
}
/** Interface for the tRPC traceql client. */
export interface TraceQLClient {
    traceql: {
        query: {
            query(input: TraceQLQueryInput): Promise<TRPCTraceQLResponse>;
        };
    };
}
/** Interface for observability tRPC client methods. */
export interface ObservabilityClient {
    ingestA11y(url: string, violations: unknown[], fingerprint?: unknown): Promise<void>;
    ingestMetrics(url: string, metrics: unknown): Promise<void>;
    ingestThemeState(url: string, theme: string, previousTheme?: string, hydrationComplete?: boolean, hydrationDuration?: number): Promise<void>;
}
/** Interface for fingerprint retrieval. */
export type GetFingerprintFn = () => Promise<string>;
/** Interface for contrast checking. */
export interface ContrastViolation {
    element: string;
    foreground: string;
    background: string;
    ratio: number;
    requiredRatio: number;
    wcagLevel: 'aa' | 'aaa';
    theme?: string;
    isDark?: boolean;
}
export interface ContrastChecker {
    scanPage(options: {
        targetLevel: 'aa' | 'aaa';
    }): ContrastViolation[];
    getSummary(): {
        worstRatio: number;
        averageRatio: number;
    };
    formatForLogging(): unknown;
}
export type GetContrastCheckerFn = () => ContrastChecker;
//# sourceMappingURL=trpc.d.ts.map