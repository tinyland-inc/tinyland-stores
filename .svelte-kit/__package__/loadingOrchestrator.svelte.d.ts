/**
 * Loading Orchestrator Store - Svelte 5 reactive wrapper
 * Provides reactive state management using Svelte 5 runes
 *
 * DEPENDENCY INJECTION: The LoadingOrchestrator must be provided
 * via configureLoadingOrchestrator() before calling initialize().
 */
import type { LoadingOrchestratorConfig, LoadingState, LoadingOrchestratorFactory } from './types/loading.js';
export type { LoadingState, LoadingOrchestratorConfig };
/**
 * Configure the loading orchestrator factory.
 * Must be called before loadingOrchestratorStore.initialize().
 */
export declare function configureLoadingOrchestrator(factory: LoadingOrchestratorFactory): void;
declare class LoadingOrchestratorStore {
    #private;
    private orchestrator;
    private config;
    constructor();
    private ensureOrchestrator;
    get state(): LoadingState;
    get phase(): LoadingState['phase'];
    get progress(): number;
    get message(): string;
    get isLoading(): boolean;
    get hasError(): boolean;
    get isReady(): boolean;
    get errorMessage(): string | undefined;
    get metrics(): LoadingState['metrics'];
    initialize(config?: LoadingOrchestratorConfig): Promise<void>;
    retry(): Promise<void>;
    updatePhase(phase: LoadingState['phase'], message: string, progress: number): void;
    markHydrationComplete(): void;
    markTRPCConnected(): void;
    markReady(): void;
    destroy(): void;
}
export declare const loadingOrchestratorStore: LoadingOrchestratorStore;
//# sourceMappingURL=loadingOrchestrator.svelte.d.ts.map