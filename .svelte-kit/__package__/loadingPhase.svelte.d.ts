export type LoadingPhase = 'detecting-fingerprint' | 'waiting-for-tempo' | 'restoring-preferences' | 'loading-theme' | 'starting-services' | 'connecting-trpc' | 'loading-a11y' | 'ready';
declare class LoadingPhaseStore {
    private state;
    get phase(): LoadingPhase;
    get progress(): number;
    get message(): string;
    get isReady(): boolean;
    get restoredFromTempo(): boolean;
    setRestoredFromTempo(restored: boolean): void;
    setTempoPolling(retryCount: number, maxRetries: number): void;
    setPhase(phase: LoadingPhase): void;
    setProgress(progress: number): void;
    markReady(): void;
}
export declare const loadingPhaseStore: LoadingPhaseStore;
export {};
//# sourceMappingURL=loadingPhase.svelte.d.ts.map