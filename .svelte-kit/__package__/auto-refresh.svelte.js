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
 * Refresh orchestrator state
 */
let activeRefreshers = $state(new Map());
let pausedRefreshers = $state(new Set());
let errorCounts = $state(new Map());
/**
 * Get recommended interval based on priority level
 */
export function getIntervalByPriority(priority) {
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
export function registerRefresh(config) {
    // Stop existing refresher if any
    stopRefresh(config.id);
    if (!config.enabled)
        return;
    // Start interval
    const intervalId = setInterval(async () => {
        if (pausedRefreshers.has(config.id))
            return;
        try {
            await config.onRefresh();
            errorCounts.set(config.id, 0); // Reset error count on success
        }
        catch (error) {
            const count = (errorCounts.get(config.id) || 0) + 1;
            errorCounts.set(config.id, count);
            if (config.onError) {
                config.onError(error);
            }
            // Exponential backoff: pause for 2^count * intervalMs (max 5 minutes)
            if (count >= 3) {
                const backoffMs = Math.min(Math.pow(2, count) * config.intervalMs, 300000 // 5 minutes max
                );
                console.warn(`[Auto-Refresh] Query ${config.id} failed ${count} times, backing off for ${backoffMs}ms`);
                pauseRefresh(config.id);
                setTimeout(() => resumeRefresh(config.id), backoffMs);
            }
        }
    }, config.intervalMs);
    activeRefreshers.set(config.id, intervalId);
    console.log(`[Auto-Refresh] Registered query ${config.id} with interval ${config.intervalMs}ms (priority: ${config.priority})`);
}
/**
 * Stop auto-refresh for a query
 */
export function stopRefresh(id) {
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
export function pauseRefresh(id) {
    pausedRefreshers.add(id);
    console.log(`[Auto-Refresh] Paused query ${id}`);
}
/**
 * Resume auto-refresh
 */
export function resumeRefresh(id) {
    pausedRefreshers.delete(id);
    console.log(`[Auto-Refresh] Resumed query ${id}`);
}
/**
 * Pause all refreshers
 */
export function pauseAll() {
    for (const id of activeRefreshers.keys()) {
        pauseRefresh(id);
    }
    console.log('[Auto-Refresh] Paused all refreshers');
}
/**
 * Resume all refreshers
 */
export function resumeAll() {
    pausedRefreshers.clear();
    console.log('[Auto-Refresh] Resumed all refreshers');
}
/**
 * Stop all refreshers
 */
export function stopAll() {
    for (const id of activeRefreshers.keys()) {
        stopRefresh(id);
    }
    console.log('[Auto-Refresh] Stopped all refreshers');
}
/**
 * Manually trigger refresh for a specific query
 */
export async function triggerRefresh(id) {
    console.log(`[Auto-Refresh] Manual trigger for query ${id}`);
    // Note: This requires access to the config's onRefresh callback
    // Consumers should call the onRefresh callback directly for manual triggers
}
/**
 * Get current refresh status
 */
export function getRefreshStatus() {
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
        }
        else {
            resumeAll();
            console.log('[Auto-Refresh] Tab visible, resuming all refreshers');
        }
    });
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopAll();
    });
}
