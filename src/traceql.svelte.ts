


















import type { TRPCTraceQLResponse, TraceQLClient } from './types/trpc.js';


export type { TRPCTraceQLResponse };

let _trpcClient: TraceQLClient | null = null;





export function configureTraceQL(client: TraceQLClient): void {
	_trpcClient = client;
}




interface QueryState {
	query: string;
	startTime: Date;
	endTime: Date;
	limit: number;
}




interface CachedResult {
	query: string;
	startTime: Date;
	endTime: Date;
	result: TRPCTraceQLResponse;
	cachedAt: Date;
	ttl: number; 
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






class TraceQLStore {
	

	private _queryState = $state<QueryState>({
		query: '',
		startTime: new Date(Date.now() - 3600000), 
		endTime: new Date(),
		limit: 100
	});

	private _results = $state<TRPCTraceQLResponse | null>(null);
	private _loading = $state<boolean>(false);
	private _error = $state<string | null>(null);
	private _lastRefresh = $state<Date | null>(null);
	private _autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
	private _autoRefreshIntervalMs = $state<number | null>(null);
	private _history = $state<QueryHistoryEntry[]>([]);
	private _pagination = $state({
		currentPage: 1,
		pageSize: 50,
		totalPages: 0,
		totalItems: 0
	});

	

	private cache = new Map<string, CachedResult>();
	private readonly DEFAULT_TTL_MS = 30000;

	

	get isStale(): boolean {
		return this._lastRefresh !== null &&
			Date.now() - this._lastRefresh.getTime() > this.DEFAULT_TTL_MS;
	}

	get isAutoRefreshEnabled(): boolean {
		return this._autoRefreshInterval !== null;
	}

	get totalTraces(): number {
		return this._results?.spans?.length ?? 0;
	}

	get totalSpans(): number {
		return this._results?.spans?.length ?? 0;
	}

	get paginatedResults(): TRPCTraceQLResponse | null {
		if (!this._results) return null;

		const start = (this._pagination.currentPage - 1) * this._pagination.pageSize;
		const end = start + this._pagination.pageSize;
		const paginatedSpans = this._results.spans.slice(start, end);

		return {
			...this._results,
			spans: paginatedSpans
		};
	}

	

	get queryState(): QueryState {
		return this._queryState;
	}

	get results(): TRPCTraceQLResponse | null {
		return this._results;
	}

	get loading(): boolean {
		return this._loading;
	}

	get error(): string | null {
		return this._error;
	}

	get lastRefresh(): Date | null {
		return this._lastRefresh;
	}

	get autoRefreshIntervalMs(): number | null {
		return this._autoRefreshIntervalMs;
	}

	get history(): QueryHistoryEntry[] {
		return this._history;
	}

	get pagination() {
		return this._pagination;
	}

	

	private getCacheKey(query: string, start: Date, end: Date): string {
		return `${query}_${start.getTime()}_${end.getTime()}`;
	}

	private getCachedResult(query: string, start: Date, end: Date): TRPCTraceQLResponse | null {
		const key = this.getCacheKey(query, start, end);
		const cached = this.cache.get(key);

		if (!cached) return null;

		const age = Date.now() - cached.cachedAt.getTime();
		if (age > cached.ttl) {
			this.cache.delete(key);
			return null;
		}

		return cached.result;
	}

	private cacheResult(
		query: string,
		start: Date,
		end: Date,
		result: TRPCTraceQLResponse,
		ttl: number = this.DEFAULT_TTL_MS
	): void {
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

	clearCache(): void {
		this.cache.clear();
	}

	

	async executeQuery(
		query: string,
		startTime: Date,
		endTime: Date,
		limit: number = 100
	): Promise<void> {
		if (!_trpcClient) {
			throw new Error(
				'TraceQL client not configured. Call configureTraceQL() first.'
			);
		}

		this._queryState = { query, startTime, endTime, limit };

		
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
		} catch (e) {
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
		} finally {
			this._loading = false;
		}
	}

	async refresh(): Promise<void> {
		const { query, startTime, endTime } = this._queryState;
		const cacheKey = this.getCacheKey(query, startTime, endTime);
		this.cache.delete(cacheKey);
		await this.executeQuery(query, startTime, endTime, this._queryState.limit);
	}

	

	startAutoRefresh(intervalMs: number = 30000): void {
		this.stopAutoRefresh();

		this._autoRefreshIntervalMs = intervalMs;
		this._autoRefreshInterval = setInterval(() => {
			if (!this._loading && this._queryState.query) {
				this.refresh();
			}
		}, intervalMs);
	}

	stopAutoRefresh(): void {
		if (this._autoRefreshInterval !== null) {
			clearInterval(this._autoRefreshInterval);
			this._autoRefreshInterval = null;
			this._autoRefreshIntervalMs = null;
		}
	}

	

	private addToHistory(entry: QueryHistoryEntry): void {
		this._history = [entry, ...this._history].slice(0, 50);
	}

	clearHistory(): void {
		this._history = [];
	}

	

	setPage(page: number): void {
		if (page >= 1 && page <= this._pagination.totalPages) {
			this._pagination.currentPage = page;
		}
	}

	setPageSize(size: number): void {
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

	async executeFromHistory(historyId: string): Promise<void> {
		const entry = this._history.find((h) => h.id === historyId);
		if (!entry) {
			throw new Error(`History entry not found: ${historyId}`);
		}
		await this.executeQuery(entry.query, entry.startTime, entry.endTime, entry.limit);
	}

	

	clearResults(): void {
		this._results = null;
		this._error = null;
		this._lastRefresh = null;
	}

	reset(): void {
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




export const traceql = new TraceQLStore();




export type { QueryState };
