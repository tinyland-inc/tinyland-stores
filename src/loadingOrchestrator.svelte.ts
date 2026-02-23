







import type {
	LoadingOrchestratorConfig,
	LoadingState,
	LoadingOrchestratorClass,
	LoadingOrchestratorFactory
} from './types/loading.js';


export type { LoadingState, LoadingOrchestratorConfig };

let _orchestratorFactory: LoadingOrchestratorFactory | null = null;





export function configureLoadingOrchestrator(factory: LoadingOrchestratorFactory): void {
	_orchestratorFactory = factory;
}


class LoadingOrchestratorStore {
	private orchestrator: LoadingOrchestratorClass | null = null;
	private config: LoadingOrchestratorConfig | null = null;

	
	#state = $state<LoadingState>({
		phase: 'initializing',
		progress: 0,
		message: 'INITIALIZING...',
		isViewportReady: false,
		hasError: false,
		metrics: {
			cssLoadTime: 0,
			fontLoadTime: 0,
			assetLoadTime: 0,
			jsLoadTime: 0,
			hydrationTime: 0,
			trpcConnectionTime: 0,
			totalTime: 0
		}
	});

	constructor() {
		
	}

	private ensureOrchestrator(): LoadingOrchestratorClass {
		if (!this.orchestrator) {
			if (!this.config) {
				throw new Error('LoadingOrchestratorStore must be initialized with config before use');
			}
			if (!_orchestratorFactory) {
				throw new Error(
					'LoadingOrchestrator factory not configured. Call configureLoadingOrchestrator() first.'
				);
			}
			this.orchestrator = _orchestratorFactory(this.config);

			
			this.orchestrator.onStateChange((newState) => {
				this.#state = { ...newState };
			});

			
			this.#state = { ...this.orchestrator.current };
		}
		return this.orchestrator;
	}

	
	get state(): LoadingState {
		return this.#state;
	}

	get phase(): LoadingState['phase'] {
		return this.#state.phase;
	}

	get progress(): number {
		return this.#state.progress;
	}

	get message(): string {
		return this.#state.message;
	}

	get isLoading(): boolean {
		return this.#state.phase !== 'ready' && !this.#state.hasError;
	}

	get hasError(): boolean {
		return this.#state.hasError;
	}

	get isReady(): boolean {
		return this.#state.phase === 'ready';
	}

	get errorMessage(): string | undefined {
		return this.#state.errorMessage;
	}

	get metrics(): LoadingState['metrics'] {
		return this.#state.metrics;
	}

	
	async initialize(config?: LoadingOrchestratorConfig): Promise<void> {
		if (config) {
			this.config = config;
		}
		await this.ensureOrchestrator().initialize();
	}

	async retry(): Promise<void> {
		await this.ensureOrchestrator().retry();
	}

	updatePhase(phase: LoadingState['phase'], message: string, progress: number): void {
		this.ensureOrchestrator().updatePhase(phase, message, progress);
	}

	markHydrationComplete(): void {
		this.ensureOrchestrator().markHydrationComplete();
	}

	markTRPCConnected(): void {
		this.ensureOrchestrator().markTRPCConnected();
	}

	markReady(): void {
		this.ensureOrchestrator().markReady();
	}

	destroy(): void {
		if (this.orchestrator) {
			this.orchestrator.destroy();
		}
	}
}


export const loadingOrchestratorStore = new LoadingOrchestratorStore();
