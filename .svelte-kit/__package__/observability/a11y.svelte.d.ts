/**
 * A11y Observability Store
 *
 * Svelte 5 runes-based store for a11y evaluation results.
 * Uses tRPC for reliable client->server streaming.
 *
 * DEPENDENCY INJECTION: The tRPC observability client, fingerprint function,
 * contrast checker, and OTel trace API must be provided via configureA11yStore()
 * before use.
 *
 * Replaces: Socket.IO-based a11y result streaming
 * Benefits: Type-safe, reliable, no WebSocket complexity
 */
import { type CircuitBreakerState } from './circuitBreaker.svelte.js';
import type { ObservabilityClient, GetFingerprintFn, ContrastViolation, GetContrastCheckerFn } from '../types/trpc.js';
export type { ContrastViolation };
/**
 * Injectable dependencies for the A11y store.
 */
export interface A11yStoreDeps {
    /** tRPC observability client for ingesting a11y data */
    observabilityClient: ObservabilityClient;
    /** Function to get device fingerprint */
    getFingerprint: GetFingerprintFn;
    /** Function to get a contrast checker instance */
    getContrastChecker: GetContrastCheckerFn;
    /** Optional OTel trace API (defaults to no-op) */
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
    /** OTel SpanStatusCode enum values */
    spanStatusCode?: {
        OK: number;
        ERROR: number;
    };
}
/**
 * Configure the A11y store dependencies.
 * Must be called before the store auto-initializes.
 */
export declare function configureA11yStore(deps: A11yStoreDeps): void;
/** A11y violation from accessibility evaluation */
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
/**
 * Export singleton instance
 * Safe for both SSR and client-side usage
 */
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