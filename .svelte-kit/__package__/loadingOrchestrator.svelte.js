let _orchestratorFactory = null;
export function configureLoadingOrchestrator(factory) {
    _orchestratorFactory = factory;
}
class LoadingOrchestratorStore {
    orchestrator = null;
    config = null;
    #state = $state({
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
    ensureOrchestrator() {
        if (!this.orchestrator) {
            if (!this.config) {
                throw new Error('LoadingOrchestratorStore must be initialized with config before use');
            }
            if (!_orchestratorFactory) {
                throw new Error('LoadingOrchestrator factory not configured. Call configureLoadingOrchestrator() first.');
            }
            this.orchestrator = _orchestratorFactory(this.config);
            this.orchestrator.onStateChange((newState) => {
                this.#state = { ...newState };
            });
            this.#state = { ...this.orchestrator.current };
        }
        return this.orchestrator;
    }
    get state() {
        return this.#state;
    }
    get phase() {
        return this.#state.phase;
    }
    get progress() {
        return this.#state.progress;
    }
    get message() {
        return this.#state.message;
    }
    get isLoading() {
        return this.#state.phase !== 'ready' && !this.#state.hasError;
    }
    get hasError() {
        return this.#state.hasError;
    }
    get isReady() {
        return this.#state.phase === 'ready';
    }
    get errorMessage() {
        return this.#state.errorMessage;
    }
    get metrics() {
        return this.#state.metrics;
    }
    async initialize(config) {
        if (config) {
            this.config = config;
        }
        await this.ensureOrchestrator().initialize();
    }
    async retry() {
        await this.ensureOrchestrator().retry();
    }
    updatePhase(phase, message, progress) {
        this.ensureOrchestrator().updatePhase(phase, message, progress);
    }
    markHydrationComplete() {
        this.ensureOrchestrator().markHydrationComplete();
    }
    markTRPCConnected() {
        this.ensureOrchestrator().markTRPCConnected();
    }
    markReady() {
        this.ensureOrchestrator().markReady();
    }
    destroy() {
        if (this.orchestrator) {
            this.orchestrator.destroy();
        }
    }
}
export const loadingOrchestratorStore = new LoadingOrchestratorStore();
