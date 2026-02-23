








import { browser } from './env.js';




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




let activeRefreshers = $state<Map<string, ReturnType<typeof setTimeout>>>(new Map());
let pausedRefreshers = $state<Set<string>>(new Set());
let errorCounts = $state<Map<string, number>>(new Map());




export function getIntervalByPriority(priority: 'high' | 'medium' | 'low'): number {
	switch (priority) {
		case 'high':
			return 15000; 
		case 'medium':
			return 30000; 
		case 'low':
			return 60000; 
	}
}




export function registerRefresh(config: RefreshConfig): void {
	
	stopRefresh(config.id);

	if (!config.enabled) return;

	
	const intervalId = setInterval(async () => {
		if (pausedRefreshers.has(config.id)) return;

		try {
			await config.onRefresh();
			errorCounts.set(config.id, 0); 
		} catch (error) {
			const count = (errorCounts.get(config.id) || 0) + 1;
			errorCounts.set(config.id, count);

			if (config.onError) {
				config.onError(error as Error);
			}

			
			if (count >= 3) {
				const backoffMs = Math.min(
					Math.pow(2, count) * config.intervalMs,
					300000 
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




export function pauseRefresh(id: string): void {
	pausedRefreshers.add(id);
	console.log(`[Auto-Refresh] Paused query ${id}`);
}




export function resumeRefresh(id: string): void {
	pausedRefreshers.delete(id);
	console.log(`[Auto-Refresh] Resumed query ${id}`);
}




export function pauseAll(): void {
	for (const id of activeRefreshers.keys()) {
		pauseRefresh(id);
	}
	console.log('[Auto-Refresh] Paused all refreshers');
}




export function resumeAll(): void {
	pausedRefreshers.clear();
	console.log('[Auto-Refresh] Resumed all refreshers');
}




export function stopAll(): void {
	for (const id of activeRefreshers.keys()) {
		stopRefresh(id);
	}
	console.log('[Auto-Refresh] Stopped all refreshers');
}




export async function triggerRefresh(id: string): Promise<void> {
	console.log(`[Auto-Refresh] Manual trigger for query ${id}`);
	
	
}




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

	
	window.addEventListener('beforeunload', () => {
		stopAll();
	});
}
