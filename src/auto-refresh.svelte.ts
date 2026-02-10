/**
 * Auto-Refresh Store (Svelte 5 Runes)
 *
 * Manages auto-refresh configuration for queries with:
 * - Priority-based intervals
 * - Exponential backoff on failures
 * - Background tab optimization
 */

import { browser } from './env.js';

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
 * Refresh orchestrator state
 */
let activeRefreshers = $state<Map<string, NodeJS.Timeout>>(new Map());
let pausedRefreshers = $state<Set<string>>(new Set());
let errorCounts = $state<Map<string, number>>(new Map());

/**
 * Get recommended interval based on priority level
 */
export function getIntervalByPriority(priority: 'high' | 'medium' | 'low'): number {
	switch (priority) {
		case 'high':
			return 15000; // 15 seconds
		case 'medium':
			return 30000; // 30 seconds
		case 'low':
			return 60000; // 1 minute
	}
}

/**
 * Register a query for auto-refresh
 */
export function registerRefresh(config: RefreshConfig): void {
	// Stop existing refresher if any
	stopRefresh(config.id);

	if (!config.enabled) return;

	// Start interval
	const intervalId = setInterval(async () => {
		if (pausedRefreshers.has(config.id)) return;

		try {
			await config.onRefresh();
			errorCounts.set(config.id, 0); // Reset error count on success
		} catch (error) {
			const count = (errorCounts.get(config.id) || 0) + 1;
			errorCounts.set(config.id, count);

			if (config.onError) {
				config.onError(error as Error);
			}

			// Exponential backoff: pause for 2^count * intervalMs (max 5 minutes)
			if (count >= 3) {
				const backoffMs = Math.min(
					Math.pow(2, count) * config.intervalMs,
					300000 // 5 minutes max
				);

				console.warn(
					`[Auto-Refresh] Query ${config.id} failed ${count} times, backing off for ${backoffMs}ms`
				);

				pauseRefresh(config.id);
				setTimeout(() => resumeRefresh(config.id), backoffMs);
			}
		}
	}, config.intervalMs);

	activeRefreshers.set(config.id, intervalId);
	console.log(
		`[Auto-Refresh] Registered query ${config.id} with interval ${config.intervalMs}ms (priority: ${config.priority})`
	);
}

/**
 * Stop auto-refresh for a query
 */
export function stopRefresh(id: string): void {
	const intervalId = activeRefreshers.get(id);
	if (intervalId) {
		clearInterval(intervalId);
		activeRefreshers.delete(id);
		console.log(`[Auto-Refresh] Stopped query ${id}`);
	}
	errorCounts.delete(id);
	pausedRefreshers.delete(id);
}

/**
 * Pause auto-refresh (doesn't clear interval, just skips execution)
 */
export function pauseRefresh(id: string): void {
	pausedRefreshers.add(id);
	console.log(`[Auto-Refresh] Paused query ${id}`);
}

/**
 * Resume auto-refresh
 */
export function resumeRefresh(id: string): void {
	pausedRefreshers.delete(id);
	console.log(`[Auto-Refresh] Resumed query ${id}`);
}

/**
 * Pause all refreshers
 */
export function pauseAll(): void {
	for (const id of activeRefreshers.keys()) {
		pauseRefresh(id);
	}
	console.log('[Auto-Refresh] Paused all refreshers');
}

/**
 * Resume all refreshers
 */
export function resumeAll(): void {
	pausedRefreshers.clear();
	console.log('[Auto-Refresh] Resumed all refreshers');
}

/**
 * Stop all refreshers
 */
export function stopAll(): void {
	for (const id of activeRefreshers.keys()) {
		stopRefresh(id);
	}
	console.log('[Auto-Refresh] Stopped all refreshers');
}

/**
 * Manually trigger refresh for a specific query
 */
export async function triggerRefresh(id: string): Promise<void> {
	console.log(`[Auto-Refresh] Manual trigger for query ${id}`);
	// Note: This requires access to the config's onRefresh callback
	// Consumers should call the onRefresh callback directly for manual triggers
}

/**
 * Get current refresh status
 */
export function getRefreshStatus(): {
	active: string[];
	paused: string[];
	errorCounts: Record<string, number>;
} {
	return {
		active: Array.from(activeRefreshers.keys()),
		paused: Array.from(pausedRefreshers),
		errorCounts: Object.fromEntries(errorCounts)
	};
}

/**
 * Background tab optimization: pause when hidden, resume when visible
 */
if (browser) {
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			pauseAll();
			console.log('[Auto-Refresh] Tab hidden, pausing all refreshers');
		} else {
			resumeAll();
			console.log('[Auto-Refresh] Tab visible, resuming all refreshers');
		}
	});

	// Cleanup on page unload
	window.addEventListener('beforeunload', () => {
		stopAll();
	});
}
