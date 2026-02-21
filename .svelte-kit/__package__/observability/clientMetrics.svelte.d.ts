/**
 * Client Metrics Observability Store
 *
 * Svelte 5 runes-based store for client-side performance metrics.
 * Tracks Core Web Vitals and custom metrics, streams via tRPC.
 *
 * DEPENDENCY INJECTION: The tRPC observability client must be provided
 * via configureObservabilityMetrics() before calling flush().
 *
 * Replaces: Socket.IO-based metrics streaming
 * Benefits: Type-safe, automatic batching, offline queue
 */
import type { ObservabilityClient } from '../types/trpc.js';
/**
 * Configure the observability client for metrics ingestion.
 * Must be called before metricsStore.flush().
 */
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
/**
 * Singleton metrics store instance
 */
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