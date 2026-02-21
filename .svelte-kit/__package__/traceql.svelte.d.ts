/**
 * TraceQL Store (Svelte 5 Runes)
 *
 * Reactive store for TraceQL query execution with caching and auto-refresh.
 * Integrates with tRPC router for Grafana Tempo queries.
 *
 * DEPENDENCY INJECTION: The tRPC client must be provided
 * via configureTraceQL() before calling executeQuery().
 *
 * Features:
 * - Query state management (query text, time range, results, loading, error)
 * - Result caching with configurable TTL (default 30s)
 * - Auto-refresh with configurable intervals
 * - Manual refresh trigger
 * - Query history tracking
 *
 * @module traceql.svelte
 */
import type { TRPCTraceQLResponse, TraceQLClient } from './types/trpc.js';
export type { TRPCTraceQLResponse };
/**
 * Configure the tRPC client for TraceQL queries.
 * Must be called before traceql.executeQuery().
 */
export declare function configureTraceQL(client: TraceQLClient): void;
/**
 * Query state interface
 */
interface QueryState {
    query: string;
    startTime: Date;
    endTime: Date;
    limit: number;
}
/**
 * Query history entry
 */
export interface QueryHistoryEntry {
    id: string;
    query: string;
    startTime: Date;
    endTime: Date;
    limit: number;
    executedAt: Date;
    executionTimeMs: number;
    resultCount: number;
    error?: string;
}
/**
 * TraceQL Store Class
 *
 * Encapsulates all TraceQL query state and operations using Svelte 5 runes.
 */
declare class TraceQLStore {
    private _queryState;
    private _results;
    private _loading;
    private _error;
    private _lastRefresh;
    private _autoRefreshInterval;
    private _autoRefreshIntervalMs;
    private _history;
    private _pagination;
    private cache;
    private readonly DEFAULT_TTL_MS;
    get isStale(): boolean;
    get isAutoRefreshEnabled(): boolean;
    get totalTraces(): number;
    get totalSpans(): number;
    get paginatedResults(): TRPCTraceQLResponse | null;
    get queryState(): QueryState;
    get results(): TRPCTraceQLResponse | null;
    get loading(): boolean;
    get error(): string | null;
    get lastRefresh(): Date | null;
    get autoRefreshIntervalMs(): number | null;
    get history(): QueryHistoryEntry[];
    get pagination(): {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
    private getCacheKey;
    private getCachedResult;
    private cacheResult;
    clearCache(): void;
    executeQuery(query: string, startTime: Date, endTime: Date, limit?: number): Promise<void>;
    refresh(): Promise<void>;
    startAutoRefresh(intervalMs?: number): void;
    stopAutoRefresh(): void;
    private addToHistory;
    clearHistory(): void;
    setPage(page: number): void;
    setPageSize(size: number): void;
    executeFromHistory(historyId: string): Promise<void>;
    clearResults(): void;
    reset(): void;
}
/**
 * Singleton TraceQL store instance
 */
export declare const traceql: TraceQLStore;
/**
 * Type exports for consumers
 */
export type { QueryState };
//# sourceMappingURL=traceql.svelte.d.ts.map