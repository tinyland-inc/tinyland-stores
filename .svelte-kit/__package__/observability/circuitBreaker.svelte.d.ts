/**
 * Smart Circuit Breaker for A11y Monitoring
 *
 * Implements intelligent circuit breaker pattern that ONLY opens on repeated failures,
 * not single transient errors.
 *
 * Features:
 * - Sliding window failure tracking (last 10 attempts)
 * - Smart opening logic (3 conditions: 60% failure rate, 5 consecutive, or all in 60s)
 * - Half-open state with exponential backoff (30s -> 5min)
 * - State persistence (localStorage)
 * - Manual reset capability
 * - Telemetry logging
 *
 * State Machine:
 * CLOSED -> OPEN (3/5 failures OR 5 consecutive OR 2+ in 60s)
 * OPEN -> HALF_OPEN (after timeout: 30s, 60s, 2min, 5min)
 * HALF_OPEN -> CLOSED (test succeeds)
 * HALF_OPEN -> OPEN (test fails, longer backoff)
 * OPEN -> HALF_OPEN (manual reset)
 */
/**
 * Circuit breaker state type
 */
export type CircuitBreakerStateType = 'CLOSED' | 'HALF_OPEN' | 'OPEN';
/**
 * Failure entry in sliding window
 */
export interface FailureEntry {
    timestamp: number;
    error: string;
}
/**
 * Circuit breaker state structure
 */
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
/**
 * Circuit breaker event metadata
 */
export interface CircuitBreakerEvent {
    timestamp: number;
    timestamp_iso: string;
    component: string;
    event_type: string;
    circuit_breaker_state: CircuitBreakerStateType;
    failure_count: number;
    [key: string]: unknown;
}
/**
 * Initialize circuit breaker with default state
 */
export declare function createCircuitBreaker(): CircuitBreakerState;
/**
 * Smart circuit breaker logic - evaluates if circuit should OPEN based on sliding window
 *
 * Circuit OPENS when ANY of these conditions are met:
 * - 3+ failures in last 5 attempts (60% failure rate)
 * - 5+ consecutive failures
 * - All failures in last 60 seconds (no successes)
 *
 * Circuit does NOT open on:
 * - Single transient error
 * - Isolated failures with recent successes
 */
export declare function shouldOpenCircuitBreaker(state: CircuitBreakerState): boolean;
/**
 * Get next retry timeout for HALF_OPEN state (exponential backoff)
 *
 * Backoff schedule:
 * - 1st failure: 30 seconds
 * - 2nd failure: 60 seconds
 * - 3rd failure: 120 seconds (2 minutes)
 * - 4th+ failures: 300 seconds (5 minutes, max)
 */
export declare function getNextRetryTimeout(failureCount: number): number;
/**
 * Persist circuit breaker state to localStorage
 */
export declare function persistCircuitBreakerState(state: CircuitBreakerState): void;
/**
 * Load circuit breaker state from localStorage
 */
export declare function loadCircuitBreakerState(): CircuitBreakerState | null;
/**
 * Log circuit breaker telemetry events
 */
export declare function logCircuitBreakerEvent(eventType: string, state: CircuitBreakerState, metadata?: Record<string, unknown>): void;
/**
 * Record successful request
 */
export declare function recordSuccess(state: CircuitBreakerState): CircuitBreakerState;
/**
 * Record failed request
 */
export declare function recordFailure(state: CircuitBreakerState, error: string): CircuitBreakerState;
/**
 * Check if circuit should transition from OPEN to HALF_OPEN
 */
export declare function checkHalfOpenTransition(state: CircuitBreakerState): CircuitBreakerState;
/**
 * Manual reset circuit breaker (admin override)
 */
export declare function manualResetCircuitBreaker(state: CircuitBreakerState): CircuitBreakerState;
/**
 * Get human-readable countdown for OPEN state
 */
export declare function getCountdownText(state: CircuitBreakerState): string | null;
//# sourceMappingURL=circuitBreaker.svelte.d.ts.map