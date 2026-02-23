












import type { ObservabilityClient } from '../types/trpc.js';

let _observabilityClient: ObservabilityClient | null = null;





export function configureObservabilityMetrics(client: ObservabilityClient): void {
	_observabilityClient = client;
}

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

interface MetricsState {
	currentMetrics: Metrics;
	history: MetricsSnapshot[];
	pendingQueue: MetricsSnapshot[];
	isCollecting: boolean;
}





function createMetricsStore() {
	let state = $state<MetricsState>({
		currentMetrics: {},
		history: [],
		pendingQueue: [],
		isCollecting: false
	});

	const hasMetrics = $derived(Object.keys(state.currentMetrics).length > 0);
	const averageFCP = $derived(
		state.history.length > 0
			? state.history.reduce((sum, s) => sum + (s.metrics.FCP || 0), 0) / state.history.length
			: 0
	);

	function updateMetrics(metrics: Partial<Metrics>) {
		state.currentMetrics = {
			...state.currentMetrics,
			...metrics
		};
	}

	function captureSnapshot() {
		const snapshot: MetricsSnapshot = {
			timestamp: Date.now(),
			url: typeof window !== 'undefined' ? window.location.href : '',
			metrics: { ...state.currentMetrics }
		};

		state.history.push(snapshot);
		state.pendingQueue.push(snapshot);

		if (state.pendingQueue.length >= 5) {
			flush();
		}
	}

	async function flush() {
		if (state.pendingQueue.length === 0) return;

		if (!_observabilityClient) {
			console.warn('[Metrics] Observability client not configured. Call configureObservabilityMetrics() first.');
			return;
		}

		const toSend = [...state.pendingQueue];
		state.pendingQueue = [];

		try {
			await Promise.all(
				toSend.map((snapshot) => _observabilityClient!.ingestMetrics(snapshot.url, snapshot.metrics))
			);
			console.log(`[Metrics] Flushed ${toSend.length} snapshots to server`);
		} catch (error) {
			console.error('[Metrics] Failed to flush snapshots:', error);
			state.pendingQueue.unshift(...toSend);
		}
	}

	function startCollection() {
		if (typeof window === 'undefined' || state.isCollecting) return;
		state.isCollecting = true;

		const lcpObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1] as any;
			updateMetrics({ LCP: lastEntry.renderTime || lastEntry.loadTime });
		});
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

		const fidObserver = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			entries.forEach((entry: any) => {
				updateMetrics({ FID: entry.processingStart - entry.startTime });
			});
		});
		fidObserver.observe({ type: 'first-input', buffered: true });

		let clsValue = 0;
		const clsObserver = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (!(entry as any).hadRecentInput) {
					clsValue += (entry as any).value;
					updateMetrics({ CLS: clsValue });
				}
			}
		});
		clsObserver.observe({ type: 'layout-shift', buffered: true });

		setTimeout(() => {
			captureSnapshot();
		}, 5000);

		console.log('[Metrics] Started Core Web Vitals collection');
	}

	function clear() {
		state.currentMetrics = {};
		state.history = [];
		state.pendingQueue = [];
	}

	return {
		get currentMetrics() { return state.currentMetrics; },
		get history() { return state.history; },
		get pendingQueueSize() { return state.pendingQueue.length; },
		get isCollecting() { return state.isCollecting; },
		get hasMetrics() { return hasMetrics; },
		get averageFCP() { return averageFCP; },
		updateMetrics,
		captureSnapshot,
		flush,
		startCollection,
		clear
	};
}




export const metricsStore = createMetricsStore();
