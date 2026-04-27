export interface LoadingState {
    phase: string;
    progress: number;
    message: string;
    isViewportReady: boolean;
    hasError: boolean;
    errorMessage?: string;
    metrics: {
        cssLoadTime: number;
        fontLoadTime: number;
        assetLoadTime: number;
        jsLoadTime: number;
        hydrationTime: number;
        trpcConnectionTime: number;
        totalTime: number;
    };
}
export interface LoadingOrchestratorConfig {
    phaseTimeout?: number;
    enableMetrics?: boolean;
    phases?: string[];
}
export interface LoadingOrchestratorClass {
    current: LoadingState;
    onStateChange(callback: (state: LoadingState) => void): void;
    initialize(): Promise<void>;
    retry(): Promise<void>;
    updatePhase(phase: string, message: string, progress: number): void;
    markHydrationComplete(): void;
    markTRPCConnected(): void;
    markReady(): void;
    destroy(): void;
}
export type LoadingOrchestratorFactory = (config: LoadingOrchestratorConfig) => LoadingOrchestratorClass;
//# sourceMappingURL=loading.d.ts.map