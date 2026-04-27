import { type CircuitBreakerState } from './circuitBreaker.svelte.js';
import type { ObservabilityClient, GetFingerprintFn, ContrastViolation, GetContrastCheckerFn } from '../types/trpc.js';
export type { ContrastViolation };
export interface A11yStoreDeps {
    observabilityClient: ObservabilityClient;
    getFingerprint: GetFingerprintFn;
    getContrastChecker: GetContrastCheckerFn;
    traceApi?: {
        getTracer(name: string): {
            startSpan(name: string): {
                isRecording(): boolean;
                setAttribute(key: string, value: unknown): void;
                setStatus(status: {
                    code: number;
                    message?: string;
                }): void;
                recordException(error: Error): void;
                end(): void;
            };
        };
    };
    spanStatusCode?: {
        OK: number;
        ERROR: number;
    };
}
export declare function configureA11yStore(deps: A11yStoreDeps): void;
interface A11yViolation {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    help: string;
    helpUrl?: string;
    nodes: Array<{
        html: string;
        target: string[];
        failureSummary?: string;
    }>;
    tags: string[];
}
export declare const a11yStore: {
    readonly violations: A11yViolation[];
    readonly isEvaluating: boolean;
    readonly lastEvaluationTime: number | null;
    readonly pendingQueueSize: number;
    readonly isConnected: boolean;
    readonly isTesting: boolean;
    readonly lastError: string | null;
    readonly lastSuccessfulFlush: number | null;
    readonly connectionTests: {
        total: number;
        successful: number;
        lastTestTime: number | null;
    };
    readonly circuitBreaker: CircuitBreakerState;
    readonly fingerprint: string | null;
    readonly a11yFingerprint: {
        screenReader?: {
            detected?: boolean;
            type?: string;
        };
        preferences?: {
            reducedMotion?: boolean;
            highContrast?: boolean;
        };
    } | null;
    readonly disabled: {
        fingerprint: string | null;
        disabledAt: number | null;
        reason: string | null;
        expiresAt: number | null;
    };
    readonly contrastViolations: ContrastViolation[];
    readonly lastContrastScanTime: number | null;
    readonly isContrastScanning: boolean;
    readonly violationCount: number;
    readonly hasCritical: boolean;
    readonly hasSerious: boolean;
    evaluate: (element?: HTMLElement) => Promise<void>;
    queueViolations: (violations: A11yViolation[]) => void;
    flush: () => Promise<void>;
    testConnection: () => Promise<boolean>;
    clear: () => void;
    initialize: () => Promise<void>;
    initializeFingerprint: () => Promise<void>;
    detectA11yFingerprint: () => {
        screenReader: {
            detected: boolean;
            type: string | null;
        };
        preferences: {
            reducedMotion: boolean;
            highContrast: boolean;
            forcedColors: boolean;
            darkMode: boolean;
        };
    } | null;
    isDisabled: () => boolean;
    disableA11y: (reason: string, hours?: number) => void;
    resetCircuitBreaker: () => void;
    scanContrast: (targetLevel?: "aa" | "aaa") => Promise<void>;
};
//# sourceMappingURL=a11y.svelte.d.ts.map