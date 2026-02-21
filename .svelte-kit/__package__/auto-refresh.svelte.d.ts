/**
 * Auto-Refresh Store (Svelte 5 Runes)
 *
 * Manages auto-refresh configuration for queries with:
 * - Priority-based intervals
 * - Exponential backoff on failures
 * - Background tab optimization
 */
/**
 * Auto-refresh configuration for a single query
 */
export interface RefreshConfig {
    id: string;
    query: string;
    startTime: Date;
    endTime: Date;
    intervalMs: number;
    enabled: boolean;
    priority: 'high' | 'medium' | 'low';
    onRefresh: () => Promise<void>;
    onError?: (error: Error) => void;
}
/**
 * Get recommended interval based on priority level
 */
export declare function getIntervalByPriority(priority: 'high' | 'medium' | 'low'): number;
/**
 * Register a query for auto-refresh
 */
export declare function registerRefresh(config: RefreshConfig): void;
/**
 * Stop auto-refresh for a query
 */
export declare function stopRefresh(id: string): void;
/**
 * Pause auto-refresh (doesn't clear interval, just skips execution)
 */
export declare function pauseRefresh(id: string): void;
/**
 * Resume auto-refresh
 */
export declare function resumeRefresh(id: string): void;
/**
 * Pause all refreshers
 */
export declare function pauseAll(): void;
/**
 * Resume all refreshers
 */
export declare function resumeAll(): void;
/**
 * Stop all refreshers
 */
export declare function stopAll(): void;
/**
 * Manually trigger refresh for a specific query
 */
export declare function triggerRefresh(id: string): Promise<void>;
/**
 * Get current refresh status
 */
export declare function getRefreshStatus(): {
    active: string[];
    paused: string[];
    errorCounts: Record<string, number>;
};
//# sourceMappingURL=auto-refresh.svelte.d.ts.map