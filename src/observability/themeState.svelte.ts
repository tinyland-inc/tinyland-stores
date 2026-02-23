












import type { ObservabilityClient } from '../types/trpc.js';

let _observabilityClient: ObservabilityClient | null = null;





export function configureThemeStateObservability(client: ObservabilityClient): void {
	_observabilityClient = client;
}

interface ThemeState {
	currentTheme: string | null;
	previousTheme: string | null;
	hydrationComplete: boolean;
	hydrationStartTime: number | null;
	hydrationDuration: number | null;
	pendingEvents: ThemeEvent[];
}

interface ThemeEvent {
	timestamp: number;
	theme: string;
	previousTheme: string | undefined;
	hydrationComplete: boolean;
	hydrationDuration?: number;
}





function createThemeStateStore() {
	let state = $state<ThemeState>({
		currentTheme: null,
		previousTheme: null,
		hydrationComplete: false,
		hydrationStartTime: null,
		hydrationDuration: null,
		pendingEvents: []
	});

	const isHydrating = $derived(!state.hydrationComplete && state.hydrationStartTime !== null);
	const hasTheme = $derived(state.currentTheme !== null);

	function startHydration() {
		state.hydrationStartTime = Date.now();
		state.hydrationComplete = false;
		console.log('[ThemeState] Hydration started');
	}

	function completeHydration() {
		if (state.hydrationStartTime === null) return;

		state.hydrationDuration = Date.now() - state.hydrationStartTime;
		state.hydrationComplete = true;

		console.log(`[ThemeState] Hydration complete (${state.hydrationDuration}ms)`);

		if (state.currentTheme) {
			queueEvent({
				timestamp: Date.now(),
				theme: state.currentTheme,
				previousTheme: state.previousTheme || undefined,
				hydrationComplete: true,
				hydrationDuration: state.hydrationDuration
			});
		}
	}

	function setTheme(theme: string) {
		if (state.currentTheme === theme) return;

		state.previousTheme = state.currentTheme;
		state.currentTheme = theme;

		queueEvent({
			timestamp: Date.now(),
			theme,
			previousTheme: state.previousTheme || undefined,
			hydrationComplete: state.hydrationComplete
		});

		console.log(`[ThemeState] Theme changed: ${state.previousTheme} -> ${theme}`);
	}

	function queueEvent(event: ThemeEvent) {
		state.pendingEvents.push(event);

		if (state.pendingEvents.length >= 5) {
			flush();
		}
	}

	async function flush() {
		if (state.pendingEvents.length === 0) return;

		if (!_observabilityClient) {
			console.warn('[ThemeState] Observability client not configured. Call configureThemeStateObservability() first.');
			return;
		}

		const toSend = [...state.pendingEvents];
		state.pendingEvents = [];

		try {
			await Promise.all(
				toSend.map((event) =>
					_observabilityClient!.ingestThemeState(
						typeof window !== 'undefined' ? window.location.href : '',
						event.theme,
						event.previousTheme,
						event.hydrationComplete,
						event.hydrationDuration
					)
				)
			);
			console.log(`[ThemeState] Flushed ${toSend.length} events to server`);
		} catch (error) {
			console.error('[ThemeState] Failed to flush events:', error);
			state.pendingEvents.unshift(...toSend);
		}
	}

	function reset() {
		state.currentTheme = null;
		state.previousTheme = null;
		state.hydrationComplete = false;
		state.hydrationStartTime = null;
		state.hydrationDuration = null;
		state.pendingEvents = [];
	}

	return {
		get currentTheme() { return state.currentTheme; },
		get previousTheme() { return state.previousTheme; },
		get hydrationComplete() { return state.hydrationComplete; },
		get hydrationDuration() { return state.hydrationDuration; },
		get pendingEventsCount() { return state.pendingEvents.length; },
		get isHydrating() { return isHydrating; },
		get hasTheme() { return hasTheme; },
		startHydration,
		completeHydration,
		setTheme,
		flush,
		reset
	};
}




export const themeStateStore = createThemeStateStore();
