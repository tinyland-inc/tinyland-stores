import type { ObservabilityClient } from '../types/trpc.js';
export declare function configureObservabilityMetrics(client: ObservabilityClient): void;
interface Metrics {
    FCP?: number;
    LCP?: number;
    FID?: number;
    CLS?: number;
    TTFB?: number;
    hydrationTime?: number;
    interactionLatency?: number;
}
interface MetricsSnapshot {
    timestamp: number;
    url: string;
    metrics: Metrics;
}
export declare const metricsStore: {
    readonly currentMetrics: Metrics;
    readonly history: MetricsSnapshot[];
    readonly pendingQueueSize: number;
    readonly isCollecting: boolean;
    readonly hasMetrics: boolean;
    readonly averageFCP: number;
    updateMetrics: (metrics: Partial<Metrics>) => void;
    captureSnapshot: () => void;
    flush: () => Promise<void>;
    startCollection: () => void;
    clear: () => void;
};
export {};
//# sourceMappingURL=clientMetrics.svelte.d.ts.map