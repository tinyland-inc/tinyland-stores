/**
 * Loading Orchestrator Store - Svelte 5 reactive wrapper
 * Provides reactive state management using Svelte 5 runes
 *
 * DEPENDENCY INJECTION: The LoadingOrchestrator must be provided
 * via configureLoadingOrchestrator() before calling initialize().
 */

import type {
	LoadingOrchestratorConfig,
	LoadingState,
	LoadingOrchestratorClass,
	LoadingOrchestratorFactory
} from './types/loading.js';

// Re-export types for consumers
export type { LoadingState, LoadingOrchestratorConfig };

let _orchestratorFactory: LoadingOrchestratorFactory | null = null;

/**
 * Configure the loading orchestrator factory.
 * Must be called before loadingOrchestratorStore.initialize().
 */
export function configureLoadingOrchestrator(factory: LoadingOrchestratorFactory): void {
	_orchestratorFactory = factory;
}

// Svelte 5 runes-based loading orchestrator store
class LoadingOrchestratorStore {
	private orchestrator: LoadingOrchestratorClass | null = null;
	private config: LoadingOrchestratorConfig | null = null;

	// Reactive state using Svelte 5 runes
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
		// Don't initialize orchestrator here - wait for explicit initialization
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

			// Subscribe to orchestrator state changes
			this.orchestrator.onStateChange((newState) => {
				this.#state = { ...newState };
			});

			// Initialize with current state
			this.#state = { ...this.orchestrator.current };
		}
		return this.orchestrator;
	}

	// Getters for reactive state
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

	// Methods to interact with orchestrator
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

// Export singleton instance
export const loadingOrchestratorStore = new LoadingOrchestratorStore();
