export type CircuitBreakerStateType = 'CLOSED' | 'HALF_OPEN' | 'OPEN';
export interface FailureEntry {
    timestamp: number;
    error: string;
}
export interface CircuitBreakerState {
    state: CircuitBreakerStateType;
    failures: number;
    lastFailureTime: number | null;
    disabledUntil: number | null;
    failureWindow: FailureEntry[];
    lastSuccessAt: number | null;
    manualResetCount: number;
    lastManualResetAt: number | null;
}
export interface CircuitBreakerEvent {
    timestamp: number;
    timestamp_iso: string;
    component: string;
    event_type: string;
    circuit_breaker_state: CircuitBreakerStateType;
    failure_count: number;
    [key: string]: unknown;
}
export declare function createCircuitBreaker(): CircuitBreakerState;
export declare function shouldOpenCircuitBreaker(state: CircuitBreakerState): boolean;
export declare function getNextRetryTimeout(failureCount: number): number;
export declare function persistCircuitBreakerState(state: CircuitBreakerState): void;
export declare function loadCircuitBreakerState(): CircuitBreakerState | null;
export declare function logCircuitBreakerEvent(eventType: string, state: CircuitBreakerState, metadata?: Record<string, unknown>): void;
export declare function recordSuccess(state: CircuitBreakerState): CircuitBreakerState;
export declare function recordFailure(state: CircuitBreakerState, error: string): CircuitBreakerState;
export declare function checkHalfOpenTransition(state: CircuitBreakerState): CircuitBreakerState;
export declare function manualResetCircuitBreaker(state: CircuitBreakerState): CircuitBreakerState;
export declare function getCountdownText(state: CircuitBreakerState): string | null;
//# sourceMappingURL=circuitBreaker.svelte.d.ts.map