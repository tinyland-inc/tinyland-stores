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
let _trpcClient = null;
/**
 * Configure the tRPC client for TraceQL queries.
 * Must be called before traceql.executeQuery().
 */
export function configureTraceQL(client) {
    _trpcClient = client;
}
/**
 * TraceQL Store Class
 *
 * Encapsulates all TraceQL query state and operations using Svelte 5 runes.
 */
class TraceQLStore {
    // ===== REACTIVE STATE (Svelte 5 Runes) =====
    _queryState = $state({
        query: '',
        startTime: new Date(Date.now() - 3600000), // 1h ago
        endTime: new Date(),
        limit: 100
    });
    _results = $state(null);
    _loading = $state(false);
    _error = $state(null);
    _lastRefresh = $state(null);
    _autoRefreshInterval = null;
    _autoRefreshIntervalMs = $state(null);
    _history = $state([]);
    _pagination = $state({
        currentPage: 1,
        pageSize: 50,
        totalPages: 0,
        totalItems: 0
    });
    // ===== CACHE MANAGEMENT =====
    cache = new Map();
    DEFAULT_TTL_MS = 30000;
    // ===== DERIVED STATE =====
    get isStale() {
        return this._lastRefresh !== null &&
            Date.now() - this._lastRefresh.getTime() > this.DEFAULT_TTL_MS;
    }
    get isAutoRefreshEnabled() {
        return this._autoRefreshInterval !== null;
    }
    get totalTraces() {
        return this._results?.spans?.length ?? 0;
    }
    get totalSpans() {
        return this._results?.spans?.length ?? 0;
    }
    get paginatedResults() {
        if (!this._results)
            return null;
        const start = (this._pagination.currentPage - 1) * this._pagination.pageSize;
        const end = start + this._pagination.pageSize;
        const paginatedSpans = this._results.spans.slice(start, end);
        return {
            ...this._results,
            spans: paginatedSpans
        };
    }
    // ===== GETTERS =====
    get queryState() {
        return this._queryState;
    }
    get results() {
        return this._results;
    }
    get loading() {
        return this._loading;
    }
    get error() {
        return this._error;
    }
    get lastRefresh() {
        return this._lastRefresh;
    }
    get autoRefreshIntervalMs() {
        return this._autoRefreshIntervalMs;
    }
    get history() {
        return this._history;
    }
    get pagination() {
        return this._pagination;
    }
    // ===== CACHE OPERATIONS =====
    getCacheKey(query, start, end) {
        return `${query}_${start.getTime()}_${end.getTime()}`;
    }
    getCachedResult(query, start, end) {
        const key = this.getCacheKey(query, start, end);
        const cached = this.cache.get(key);
        if (!cached)
            return null;
        const age = Date.now() - cached.cachedAt.getTime();
        if (age > cached.ttl) {
            this.cache.delete(key);
            return null;
        }
        return cached.result;
    }
    cacheResult(query, start, end, result, ttl = this.DEFAULT_TTL_MS) {
        const key = this.getCacheKey(query, start, end);
        this.cache.set(key, {
            query,
            startTime: start,
            endTime: end,
            result,
            cachedAt: new Date(),
            ttl
        });
    }
    clearCache() {
        this.cache.clear();
    }
    // ===== QUERY OPERATIONS =====
    async executeQuery(query, startTime, endTime, limit = 100) {
        if (!_trpcClient) {
            throw new Error('TraceQL client not configured. Call configureTraceQL() first.');
        }
        this._queryState = { query, startTime, endTime, limit };
        // Check cache first
        const cached = this.getCachedResult(query, startTime, endTime);
        if (cached) {
            this._results = cached;
            this._error = null;
            this._lastRefresh = new Date();
            return;
        }
        this._loading = true;
        this._error = null;
        const startMs = Date.now();
        try {
            const result = await _trpcClient.traceql.query.query({
                query,
                startTime,
                endTime,
                limit
            });
            this._results = result;
            this._lastRefresh = new Date();
            this._pagination.totalItems = result.spans.length;
            this._pagination.totalPages = Math.max(1, Math.ceil(result.spans.length / this._pagination.pageSize));
            this._pagination.currentPage = 1;
            this.cacheResult(query, startTime, endTime, result);
            this.addToHistory({
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                query,
                startTime,
                endTime,
                limit,
                executedAt: new Date(),
                executionTimeMs: Date.now() - startMs,
                resultCount: result.spans.length
            });
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            this._error = errorMessage;
            this._results = null;
            this.addToHistory({
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                query,
                startTime,
                endTime,
                limit,
                executedAt: new Date(),
                executionTimeMs: Date.now() - startMs,
                resultCount: 0,
                error: errorMessage
            });
        }
        finally {
            this._loading = false;
        }
    }
    async refresh() {
        const { query, startTime, endTime } = this._queryState;
        const cacheKey = this.getCacheKey(query, startTime, endTime);
        this.cache.delete(cacheKey);
        await this.executeQuery(query, startTime, endTime, this._queryState.limit);
    }
    // ===== AUTO-REFRESH =====
    startAutoRefresh(intervalMs = 30000) {
        this.stopAutoRefresh();
        this._autoRefreshIntervalMs = intervalMs;
        this._autoRefreshInterval = setInterval(() => {
            if (!this._loading && this._queryState.query) {
                this.refresh();
            }
        }, intervalMs);
    }
    stopAutoRefresh() {
        if (this._autoRefreshInterval !== null) {
            clearInterval(this._autoRefreshInterval);
            this._autoRefreshInterval = null;
            this._autoRefreshIntervalMs = null;
        }
    }
    // ===== HISTORY MANAGEMENT =====
    addToHistory(entry) {
        this._history = [entry, ...this._history].slice(0, 50);
    }
    clearHistory() {
        this._history = [];
    }
    // ===== PAGINATION =====
    setPage(page) {
        if (page >= 1 && page <= this._pagination.totalPages) {
            this._pagination.currentPage = page;
        }
    }
    setPageSize(size) {
        if (size > 0) {
            this._pagination.pageSize = size;
            if (this._results) {
                this._pagination.totalPages = Math.max(1, Math.ceil(this._results.spans.length / size));
                if (this._pagination.currentPage > this._pagination.totalPages) {
                    this._pagination.currentPage = 1;
                }
            }
        }
    }
    async executeFromHistory(historyId) {
        const entry = this._history.find((h) => h.id === historyId);
        if (!entry) {
            throw new Error(`History entry not found: ${historyId}`);
        }
        await this.executeQuery(entry.query, entry.startTime, entry.endTime, entry.limit);
    }
    // ===== RESET =====
    clearResults() {
        this._results = null;
        this._error = null;
        this._lastRefresh = null;
    }
    reset() {
        this.stopAutoRefresh();
        this.clearResults();
        this.clearCache();
        this.clearHistory();
        this._queryState = {
            query: '',
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(),
            limit: 100
        };
        this._loading = false;
    }
}
/**
 * Singleton TraceQL store instance
 */
export const traceql = new TraceQLStore();
