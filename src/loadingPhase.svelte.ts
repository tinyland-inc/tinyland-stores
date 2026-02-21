/**
 * Loading Phase Store - Svelte 5 Runes
 *
 * Tracks loading progress through phases that mirror the OTel-first architecture:
 *
 * SERVER-SIDE (already completed by render time):
 * 1. fingerprintSettingsHandle -> queries Tempo for fingerprint settings
 * 2. consentCheckHandle -> restores consent from Tempo OR cookies
 * 3. referrerEnrichmentHandle -> enriches referrer with ActivityPub/UTM/etc.
 *
 * CLIENT-SIDE (hydration phases this store tracks):
 * 1. 'detecting-fingerprint' -> checking server data for fingerprint
 * 2. 'waiting-for-tempo' -> polling Tempo if unavailable (retry loop)
 * 3. 'restoring-preferences' -> applying Tempo-restored or default settings
 * 4. 'loading-theme' -> hydrating theme from server settings
 * 5. 'starting-services' -> metrics, tRPC, navigation tracking
 * 6. 'loading-a11y' -> conditionally loading a11y components
 * 7. 'ready' -> app fully hydrated
 */

export type LoadingPhase =
	| 'detecting-fingerprint'  // 5% - Check server-provided fingerprint data
	| 'waiting-for-tempo'      // 10% - Polling Tempo if unavailable
	| 'restoring-preferences'  // 15% - Restore from Tempo or use defaults
	| 'loading-theme'          // 30% - Hydrate theme settings
	| 'starting-services'      // 50% - Metrics, tRPC, navigation
	| 'connecting-trpc'        // 70% - tRPC connection specifically
	| 'loading-a11y'           // 90% - A11y components (if consented)
	| 'ready';                 // 100% - Fully hydrated

interface LoadingState {
	phase: LoadingPhase;
	progress: number;
	message: string;
	/** Whether settings came from Tempo (returning visitor) */
	restoredFromTempo: boolean;
}

const phaseConfig: Record<LoadingPhase, { progress: number; message: string }> = {
	'detecting-fingerprint': { progress: 5, message: 'DETECTING FINGERPRINT...' },
	'waiting-for-tempo': { progress: 10, message: 'WAITING FOR TEMPO...' },
	'restoring-preferences': { progress: 15, message: 'RESTORING FROM TEMPO...' },
	'loading-theme': { progress: 30, message: 'LOADING THEME...' },
	'starting-services': { progress: 50, message: 'STARTING SERVICES...' },
	'connecting-trpc': { progress: 70, message: 'CONNECTING...' },
	'loading-a11y': { progress: 90, message: 'LOADING A11Y...' },
	'ready': { progress: 100, message: 'READY!' }
};

class LoadingPhaseStore {
	private state = $state<LoadingState>({
		phase: 'detecting-fingerprint',
		progress: 5,
		message: 'DETECTING FINGERPRINT...',
		restoredFromTempo: false
	});

	get phase(): LoadingPhase {
		return this.state.phase;
	}

	get progress(): number {
		return this.state.progress;
	}

	get message(): string {
		return this.state.message;
	}

	get isReady(): boolean {
		return this.state.phase === 'ready';
	}

	/** Whether settings were restored from Tempo (returning visitor) */
	get restoredFromTempo(): boolean {
		return this.state.restoredFromTempo;
	}

	/**
	 * Set whether settings were restored from Tempo
	 * Called after checking server data for fingerprint settings
	 */
	setRestoredFromTempo(restored: boolean): void {
		this.state.restoredFromTempo = restored;
		// Update message to reflect source
		if (this.state.phase === 'restoring-preferences') {
			this.state.message = restored ? 'RESTORING FROM TEMPO...' : 'LOADING DEFAULTS...';
		}
	}

	/**
	 * Set Tempo polling state with retry count
	 * Shows current retry attempt and max retries in the message
	 */
	setTempoPolling(retryCount: number, maxRetries: number): void {
		this.state.phase = 'waiting-for-tempo';
		this.state.progress = 10;
		this.state.message = `WAITING FOR TEMPO (${retryCount}/${maxRetries})...`;
		console.log(`[Loading] Tempo polling: attempt ${retryCount}/${maxRetries}`);
	}

	setPhase(phase: LoadingPhase): void {
		const config = phaseConfig[phase];

		// Only advance, never go backwards
		if (config.progress <= this.state.progress && phase !== 'ready') {
			return;
		}

		console.log(`[Loading] ${this.state.phase} -> ${phase} (${config.progress}%)`);

		this.state.phase = phase;
		this.state.progress = config.progress;

		// Use contextual message for restoring-preferences phase
		if (phase === 'restoring-preferences') {
			this.state.message = this.state.restoredFromTempo ? 'RESTORING FROM TEMPO...' : 'LOADING DEFAULTS...';
		} else {
			this.state.message = config.message;
		}
	}

	setProgress(progress: number): void {
		// Only allow progress between 0-100
		const clampedProgress = Math.max(0, Math.min(100, progress));

		// Only allow progress to increase
		if (clampedProgress < this.state.progress) {
			return;
		}

		console.log(`[Loading] Progress: ${this.state.progress}% -> ${clampedProgress}%`);

		this.state.progress = clampedProgress;

		// Update phase based on progress
		if (clampedProgress >= 100) {
			this.state.phase = 'ready';
			this.state.message = 'READY!';
		} else if (clampedProgress >= 90) {
			this.state.phase = 'loading-a11y';
			this.state.message = 'LOADING A11Y...';
		} else if (clampedProgress >= 70) {
			this.state.phase = 'connecting-trpc';
			this.state.message = 'CONNECTING...';
		} else if (clampedProgress >= 50) {
			this.state.phase = 'starting-services';
			this.state.message = 'STARTING SERVICES...';
		} else if (clampedProgress >= 30) {
			this.state.phase = 'loading-theme';
			this.state.message = 'LOADING THEME...';
		} else if (clampedProgress >= 15) {
			this.state.phase = 'restoring-preferences';
			this.state.message = this.state.restoredFromTempo ? 'RESTORING FROM TEMPO...' : 'LOADING DEFAULTS...';
		} else if (clampedProgress >= 10) {
			this.state.phase = 'waiting-for-tempo';
			this.state.message = 'WAITING FOR TEMPO...';
		} else {
			this.state.phase = 'detecting-fingerprint';
			this.state.message = 'DETECTING FINGERPRINT...';
		}
	}

	markReady(): void {
		this.setPhase('ready');
	}
}

export const loadingPhaseStore = new LoadingPhaseStore();
