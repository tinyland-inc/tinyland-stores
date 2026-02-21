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

import { browser } from '../env.js';

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
	failures: number; // Legacy counter (kept for compatibility)
	lastFailureTime: number | null;
	disabledUntil: number | null;

	// Sliding window tracking
	failureWindow: FailureEntry[];
	lastSuccessAt: number | null;

	// Manual reset tracking
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
export function createCircuitBreaker(): CircuitBreakerState {
	return {
		state: 'CLOSED',
		failures: 0,
		lastFailureTime: null,
		disabledUntil: null,
		failureWindow: [],
		lastSuccessAt: null,
		manualResetCount: 0,
		lastManualResetAt: null
	};
}

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
export function shouldOpenCircuitBreaker(state: CircuitBreakerState): boolean {
	const failureWindow = state.failureWindow || [];
	const now = Date.now();
	const SIXTY_SECONDS = 60 * 1000;
	const FIVE_MINUTES = 5 * 60 * 1000;

	// No failures yet - stay closed
	if (failureWindow.length === 0) return false;

	// Clean up old failures (>5 minutes old)
	const recentFailures = failureWindow.filter((f) => now - f.timestamp < FIVE_MINUTES);

	// Condition 1: 3+ failures in last 5 attempts (60% failure rate)
	if (recentFailures.length >= 3) {
		const last5Attempts = recentFailures.slice(-5);
		const failuresIn5 = last5Attempts.length;
		if (failuresIn5 >= 3) {
			console.warn(
				`[A11y Circuit Breaker] Opening: ${failuresIn5}/5 recent attempts failed (60% failure rate)`
			);
			return true;
		}
	}

	// Condition 2: 5+ consecutive failures (no successes in window)
	if (recentFailures.length >= 5) {
		const lastSuccess = state.lastSuccessAt || 0;
		const oldestFailure = recentFailures[0].timestamp;
		if (oldestFailure > lastSuccess) {
			console.warn(
				`[A11y Circuit Breaker] Opening: ${recentFailures.length} consecutive failures (no successes)`
			);
			return true;
		}
	}

	// Condition 3: All failures in last 60 seconds (no successes)
	const failuresInLast60s = recentFailures.filter((f) => now - f.timestamp < SIXTY_SECONDS);
	if (failuresInLast60s.length > 0) {
		const lastSuccess = state.lastSuccessAt || 0;
		const hasRecentSuccess = now - lastSuccess < SIXTY_SECONDS;
		if (!hasRecentSuccess && failuresInLast60s.length >= 2) {
			console.warn(
				`[A11y Circuit Breaker] Opening: ${failuresInLast60s.length} failures in 60s with no successes`
			);
			return true;
		}
	}

	return false;
}

/**
 * Get next retry timeout for HALF_OPEN state (exponential backoff)
 *
 * Backoff schedule:
 * - 1st failure: 30 seconds
 * - 2nd failure: 60 seconds
 * - 3rd failure: 120 seconds (2 minutes)
 * - 4th+ failures: 300 seconds (5 minutes, max)
 */
export function getNextRetryTimeout(failureCount: number): number {
	const baseTimeout = 30 * 1000; // 30 seconds
	const maxTimeout = 5 * 60 * 1000; // 5 minutes
	const timeout = Math.min(baseTimeout * Math.pow(2, failureCount - 1), maxTimeout);
	return timeout;
}

/**
 * Persist circuit breaker state to localStorage
 */
export function persistCircuitBreakerState(state: CircuitBreakerState): void {
	if (!browser) return;

	try {
		const stateToPersist = {
			state: state.state,
			failureWindow: state.failureWindow,
			lastSuccessAt: state.lastSuccessAt,
			lastFailureTime: state.lastFailureTime,
			disabledUntil: state.disabledUntil,
			failures: state.failures,
			manualResetCount: state.manualResetCount,
			lastManualResetAt: state.lastManualResetAt
		};

		localStorage.setItem('a11y_circuit_breaker', JSON.stringify(stateToPersist));
		console.debug('[A11y Circuit Breaker] State persisted to localStorage');
	} catch (error) {
		console.warn('[A11y Circuit Breaker] Failed to persist state:', error);
	}
}

/**
 * Load circuit breaker state from localStorage
 */
export function loadCircuitBreakerState(): CircuitBreakerState | null {
	if (!browser) return null;

	try {
		const stored = localStorage.getItem('a11y_circuit_breaker');
		if (stored) {
			const parsed = JSON.parse(stored);
			console.info(
				'[A11y Circuit Breaker] State restored from localStorage',
				parsed.state
			);

			logCircuitBreakerEvent('state_restored', parsed, {
				state: parsed.state,
				failureCount: parsed.failureWindow?.length || 0
			});

			return parsed;
		}
	} catch (error) {
		console.warn('[A11y Circuit Breaker] Failed to load state:', error);
	}

	return null;
}

/**
 * Log circuit breaker telemetry events
 */
export function logCircuitBreakerEvent(
	eventType: string,
	state: CircuitBreakerState,
	metadata: Record<string, unknown> = {}
): void {
	const event: CircuitBreakerEvent = {
		timestamp: Date.now(),
		timestamp_iso: new Date().toISOString(),
		component: 'a11y-circuit-breaker',
		event_type: eventType,
		circuit_breaker_state: state.state,
		failure_count: state.failureWindow?.length || 0,
		...metadata
	};

	console.info(`[A11y Circuit Breaker] ${eventType}`, event);
}

/**
 * Record successful request
 */
export function recordSuccess(state: CircuitBreakerState): CircuitBreakerState {
	const now = Date.now();

	state.lastSuccessAt = now;

	if (state.state === 'HALF_OPEN') {
		state.state = 'CLOSED';
		console.info(
			'[A11y Circuit Breaker] Transitioning HALF_OPEN -> CLOSED (test succeeded)'
		);
		logCircuitBreakerEvent('transition_closed_from_half_open', state, { successAt: now });
	}

	state.failures = 0;
	state.lastFailureTime = null;
	state.disabledUntil = null;

	persistCircuitBreakerState(state);

	return state;
}

/**
 * Record failed request
 */
export function recordFailure(
	state: CircuitBreakerState,
	error: string
): CircuitBreakerState {
	const now = Date.now();

	state.failureWindow = state.failureWindow || [];
	state.failureWindow.push({
		timestamp: now,
		error
	});

	if (state.failureWindow.length > 10) {
		state.failureWindow = state.failureWindow.slice(-10);
	}

	state.failures++;
	state.lastFailureTime = now;

	const shouldOpen = shouldOpenCircuitBreaker(state);

	if (shouldOpen) {
		const timeout = getNextRetryTimeout(state.failures);
		state.state = 'OPEN';
		state.disabledUntil = now + timeout;

		const timeoutSeconds = Math.round(timeout / 1000);
		console.error(
			`[A11y Circuit Breaker] OPENING circuit for ${timeoutSeconds}s (failure pattern detected)`
		);

		logCircuitBreakerEvent('circuit_opened', state, {
			failureCount: state.failureWindow.length,
			timeout: timeoutSeconds,
			error
		});
	} else if (state.state === 'HALF_OPEN') {
		const timeout = getNextRetryTimeout(state.failures);
		state.state = 'OPEN';
		state.disabledUntil = now + timeout;

		const timeoutSeconds = Math.round(timeout / 1000);
		console.warn(
			`[A11y Circuit Breaker] HALF_OPEN test failed -> OPEN for ${timeoutSeconds}s`
		);

		logCircuitBreakerEvent('half_open_test_failed', state, {
			failureCount: state.failures,
			timeout: timeoutSeconds,
			error
		});
	} else {
		console.warn(
			`[A11y] Transient failure recorded (attempt ${state.failures}, circuit remains CLOSED)`
		);
	}

	persistCircuitBreakerState(state);

	return state;
}

/**
 * Check if circuit should transition from OPEN to HALF_OPEN
 */
export function checkHalfOpenTransition(state: CircuitBreakerState): CircuitBreakerState {
	const now = Date.now();

	if (state.state === 'OPEN') {
		if (now >= (state.disabledUntil || 0)) {
			state.state = 'HALF_OPEN';
			console.info(
				'[A11y Circuit Breaker] Transitioning OPEN -> HALF_OPEN (testing connection)'
			);
			logCircuitBreakerEvent('transition_half_open', state, {
				disabledUntil: state.disabledUntil
			});
			persistCircuitBreakerState(state);
		}
	}

	return state;
}

/**
 * Manual reset circuit breaker (admin override)
 */
export function manualResetCircuitBreaker(state: CircuitBreakerState): CircuitBreakerState {
	const now = Date.now();

	state.state = 'HALF_OPEN';
	state.disabledUntil = null;
	state.manualResetCount++;
	state.lastManualResetAt = now;

	console.warn('[A11y Circuit Breaker] Manual reset initiated by admin');

	logCircuitBreakerEvent('manual_reset', state, {
		resetCount: state.manualResetCount,
		previousState: state.state,
		failureCount: state.failureWindow.length
	});

	persistCircuitBreakerState(state);

	return state;
}

/**
 * Get human-readable countdown for OPEN state
 */
export function getCountdownText(state: CircuitBreakerState): string | null {
	if (state.state !== 'OPEN' || !state.disabledUntil) return null;

	const now = Date.now();
	const remainingMs = state.disabledUntil - now;

	if (remainingMs <= 0) return 'retrying...';

	const remainingSeconds = Math.ceil(remainingMs / 1000);

	if (remainingSeconds < 60) {
		return `retry in ${remainingSeconds}s`;
	}

	const remainingMinutes = Math.ceil(remainingSeconds / 60);
	return `retry in ${remainingMinutes}m`;
}
