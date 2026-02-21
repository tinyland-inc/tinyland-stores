/**
 * Global Accessibility Store (Svelte 5 Runes)
 *
 * Manages accessibility evaluation orchestration with:
 * - Backend-first observability (always-on evaluation)
 * - Buffer management with backpressure
 * - Connection monitoring
 * - Continuous evaluation loop
 *
 * DEPENDENCY INJECTION: The AccessibilityOrchestrator must be provided
 * via configureGlobalAccessibility() before calling init().
 */
import type { EvaluationResult, EvaluationStats, EvaluationConfig, AccessibilityOrchestratorInterface, AccessibilityOrchestratorFactory } from './types/accessibility.js';
export type { EvaluationResult, EvaluationStats, EvaluationConfig };
/**
 * Configure the accessibility orchestrator factory.
 * Must be called before globalAccessibility.init().
 */
export declare function configureGlobalAccessibility(factory: AccessibilityOrchestratorFactory): void;
declare class GlobalAccessibilityStore {
    #private;
    get connectionStatus(): string;
    get results(): EvaluationResult[];
    get stats(): EvaluationStats;
    get lastUpdate(): Date | null;
    get isAnalyzing(): boolean;
    get initialized(): boolean;
    setConnectionStatus(value: string): void;
    isConnected: boolean;
    connectionColor: string;
    timeSinceUpdate: number;
    updateTimeText: string;
    hasRecentResults: boolean;
    criticalIssueCount: number;
    warningCount: number;
    liveFeedStatus: string;
    score: number;
    resultsByType: () => Map<string, EvaluationResult[]>;
    private handleResults;
    private clearTransmittedResults;
    init(): Promise<void>;
    private startContinuousEvaluation;
    showMonitor(): void;
    hideMonitor(): void;
    private setupConnectionMonitoring;
    start(): void;
    stop(): void;
    evaluate(): Promise<void>;
    highlightElement(selector: string): void;
    get orchestratorInstance(): AccessibilityOrchestratorInterface | null;
    get socket(): {
        on?(event: string, handler: (...args: unknown[]) => void): void;
        emit?(event: string, data: unknown): void;
        getStatus?(): {
            connected: boolean;
        };
    } | null;
    get client(): {
        on?(event: string, handler: (...args: unknown[]) => void): void;
        emit?(event: string, data: unknown): void;
        getStatus?(): {
            connected: boolean;
        };
    } | null;
    private estimateBufferMemoryUsage;
    private emitBackpressure;
    destroy(): void;
}
export declare const globalAccessibility: GlobalAccessibilityStore;
//# sourceMappingURL=globalAccessibility.svelte.d.ts.map