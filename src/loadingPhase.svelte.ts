



















export type LoadingPhase =
	| 'detecting-fingerprint'  
	| 'waiting-for-tempo'      
	| 'restoring-preferences'  
	| 'loading-theme'          
	| 'starting-services'      
	| 'connecting-trpc'        
	| 'loading-a11y'           
	| 'ready';                 

interface LoadingState {
	phase: LoadingPhase;
	progress: number;
	message: string;
	
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

	
	get restoredFromTempo(): boolean {
		return this.state.restoredFromTempo;
	}

	



	setRestoredFromTempo(restored: boolean): void {
		this.state.restoredFromTempo = restored;
		
		if (this.state.phase === 'restoring-preferences') {
			this.state.message = restored ? 'RESTORING FROM TEMPO...' : 'LOADING DEFAULTS...';
		}
	}

	



	setTempoPolling(retryCount: number, maxRetries: number): void {
		this.state.phase = 'waiting-for-tempo';
		this.state.progress = 10;
		this.state.message = `WAITING FOR TEMPO (${retryCount}/${maxRetries})...`;
		console.log(`[Loading] Tempo polling: attempt ${retryCount}/${maxRetries}`);
	}

	setPhase(phase: LoadingPhase): void {
		const config = phaseConfig[phase];

		
		if (config.progress <= this.state.progress && phase !== 'ready') {
			return;
		}

		console.log(`[Loading] ${this.state.phase} -> ${phase} (${config.progress}%)`);

		this.state.phase = phase;
		this.state.progress = config.progress;

		
		if (phase === 'restoring-preferences') {
			this.state.message = this.state.restoredFromTempo ? 'RESTORING FROM TEMPO...' : 'LOADING DEFAULTS...';
		} else {
			this.state.message = config.message;
		}
	}

	setProgress(progress: number): void {
		
		const clampedProgress = Math.max(0, Math.min(100, progress));

		
		if (clampedProgress < this.state.progress) {
			return;
		}

		console.log(`[Loading] Progress: ${this.state.progress}% -> ${clampedProgress}%`);

		this.state.progress = clampedProgress;

		
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
