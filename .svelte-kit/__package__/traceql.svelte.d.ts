import type { TRPCTraceQLResponse, TraceQLClient } from './types/trpc.js';
export type { TRPCTraceQLResponse };
export declare function configureTraceQL(client: TraceQLClient): void;
interface QueryState {
    query: string;
    startTime: Date;
    endTime: Date;
    limit: number;
}
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
export declare const traceql: TraceQLStore;
export type { QueryState };
//# sourceMappingURL=traceql.svelte.d.ts.map