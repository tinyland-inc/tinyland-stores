import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	createCircuitBreaker,
	shouldOpenCircuitBreaker,
	getNextRetryTimeout,
	recordSuccess,
	recordFailure,
	checkHalfOpenTransition,
	manualResetCircuitBreaker,
	getCountdownText,
	type CircuitBreakerState
} from '../src/observability/circuitBreaker.svelte.js';







describe('Circuit Breaker', () => {
	let state: CircuitBreakerState;

	beforeEach(() => {
		state = createCircuitBreaker();
		vi.stubGlobal('localStorage', {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn(() => null)
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('createCircuitBreaker', () => {
		it('should create circuit breaker in CLOSED state', () => {
			expect(state.state).toBe('CLOSED');
			expect(state.failures).toBe(0);
			expect(state.failureWindow).toEqual([]);
			expect(state.lastSuccessAt).toBeNull();
			expect(state.manualResetCount).toBe(0);
		});
	});

	describe('shouldOpenCircuitBreaker', () => {
		it('should not open with no failures', () => {
			expect(shouldOpenCircuitBreaker(state)).toBe(false);
		});

		it('should not open on single failure', () => {
			state.failureWindow = [{ timestamp: Date.now(), error: 'test error' }];
			expect(shouldOpenCircuitBreaker(state)).toBe(false);
		});

		it('should open on 3+ failures in last 5 attempts (60% failure rate)', () => {
			const now = Date.now();
			state.failureWindow = [
				{ timestamp: now - 4000, error: 'error 1' },
				{ timestamp: now - 3000, error: 'error 2' },
				{ timestamp: now - 2000, error: 'error 3' }
			];
			expect(shouldOpenCircuitBreaker(state)).toBe(true);
		});

		it('should open on 5+ consecutive failures', () => {
			const now = Date.now();
			state.lastSuccessAt = now - 600000; 
			state.failureWindow = [
				{ timestamp: now - 5000, error: 'error 1' },
				{ timestamp: now - 4000, error: 'error 2' },
				{ timestamp: now - 3000, error: 'error 3' },
				{ timestamp: now - 2000, error: 'error 4' },
				{ timestamp: now - 1000, error: 'error 5' }
			];
			expect(shouldOpenCircuitBreaker(state)).toBe(true);
		});

		it('should open on 2+ failures in 60s with no successes', () => {
			const now = Date.now();
			state.lastSuccessAt = now - 120000; 
			state.failureWindow = [
				{ timestamp: now - 30000, error: 'error 1' },
				{ timestamp: now - 10000, error: 'error 2' }
			];
			expect(shouldOpenCircuitBreaker(state)).toBe(true);
		});

		it('should NOT open if recent success exists in 60s window', () => {
			const now = Date.now();
			state.lastSuccessAt = now - 5000; 
			state.failureWindow = [
				{ timestamp: now - 3000, error: 'error 1' }
			];
			expect(shouldOpenCircuitBreaker(state)).toBe(false);
		});

		it('should ignore failures older than 5 minutes', () => {
			const now = Date.now();
			const sixMinutesAgo = now - 6 * 60 * 1000;
			state.failureWindow = [
				{ timestamp: sixMinutesAgo, error: 'old error 1' },
				{ timestamp: sixMinutesAgo + 1000, error: 'old error 2' },
				{ timestamp: sixMinutesAgo + 2000, error: 'old error 3' }
			];
			expect(shouldOpenCircuitBreaker(state)).toBe(false);
		});
	});

	describe('getNextRetryTimeout', () => {
		it('should return 30s for first failure', () => {
			expect(getNextRetryTimeout(1)).toBe(30000);
		});

		it('should return 60s for second failure', () => {
			expect(getNextRetryTimeout(2)).toBe(60000);
		});

		it('should return 120s for third failure', () => {
			expect(getNextRetryTimeout(3)).toBe(120000);
		});

		it('should cap at 5 minutes', () => {
			expect(getNextRetryTimeout(10)).toBe(300000);
			expect(getNextRetryTimeout(100)).toBe(300000);
		});

		it('should follow exponential backoff pattern', () => {
			const timeout1 = getNextRetryTimeout(1);
			const timeout2 = getNextRetryTimeout(2);
			const timeout3 = getNextRetryTimeout(3);

			expect(timeout2).toBe(timeout1 * 2);
			expect(timeout3).toBe(timeout1 * 4);
		});
	});

	describe('recordSuccess', () => {
		it('should update lastSuccessAt', () => {
			const before = Date.now();
			state = recordSuccess(state);
			expect(state.lastSuccessAt).toBeGreaterThanOrEqual(before);
		});

		it('should reset failure counters', () => {
			state.failures = 3;
			state.lastFailureTime = Date.now();
			state.disabledUntil = Date.now() + 30000;

			state = recordSuccess(state);

			expect(state.failures).toBe(0);
			expect(state.lastFailureTime).toBeNull();
			expect(state.disabledUntil).toBeNull();
		});

		it('should transition HALF_OPEN to CLOSED', () => {
			state.state = 'HALF_OPEN';
			state = recordSuccess(state);
			expect(state.state).toBe('CLOSED');
		});

		it('should not change CLOSED state', () => {
			state.state = 'CLOSED';
			state = recordSuccess(state);
			expect(state.state).toBe('CLOSED');
		});
	});

	describe('recordFailure', () => {
		it('should add failure to window', () => {
			state = recordFailure(state, 'test error');
			expect(state.failureWindow.length).toBe(1);
			expect(state.failureWindow[0].error).toBe('test error');
		});

		it('should increment failure counter', () => {
			state = recordFailure(state, 'error 1');
			expect(state.failures).toBe(1);

			state = recordFailure(state, 'error 2');
			expect(state.failures).toBe(2);
		});

		it('should keep only last 10 failures', () => {
			for (let i = 0; i < 15; i++) {
				state.failureWindow.push({
					timestamp: Date.now() + i,
					error: `error ${i}`
				});
			}
			state.failures = 15;

			state = recordFailure(state, 'error 15');

			
			expect(state.failureWindow.length).toBeLessThanOrEqual(10);
		});

		it('should transition HALF_OPEN to OPEN on failure', () => {
			state.state = 'HALF_OPEN';
			state.failures = 0;
			state = recordFailure(state, 'test failed');
			expect(state.state).toBe('OPEN');
			expect(state.disabledUntil).not.toBeNull();
		});
	});

	describe('checkHalfOpenTransition', () => {
		it('should transition OPEN to HALF_OPEN when timeout expires', () => {
			state.state = 'OPEN';
			state.disabledUntil = Date.now() - 1000; 

			state = checkHalfOpenTransition(state);
			expect(state.state).toBe('HALF_OPEN');
		});

		it('should not transition if timeout not expired', () => {
			state.state = 'OPEN';
			state.disabledUntil = Date.now() + 30000; 

			state = checkHalfOpenTransition(state);
			expect(state.state).toBe('OPEN');
		});

		it('should not affect CLOSED state', () => {
			state.state = 'CLOSED';
			state = checkHalfOpenTransition(state);
			expect(state.state).toBe('CLOSED');
		});
	});

	describe('manualResetCircuitBreaker', () => {
		it('should transition to HALF_OPEN', () => {
			state.state = 'OPEN';
			state = manualResetCircuitBreaker(state);
			expect(state.state).toBe('HALF_OPEN');
		});

		it('should clear disabledUntil', () => {
			state.disabledUntil = Date.now() + 60000;
			state = manualResetCircuitBreaker(state);
			expect(state.disabledUntil).toBeNull();
		});

		it('should increment manual reset count', () => {
			expect(state.manualResetCount).toBe(0);
			state = manualResetCircuitBreaker(state);
			expect(state.manualResetCount).toBe(1);
			state = manualResetCircuitBreaker(state);
			expect(state.manualResetCount).toBe(2);
		});

		it('should set lastManualResetAt', () => {
			const before = Date.now();
			state = manualResetCircuitBreaker(state);
			expect(state.lastManualResetAt).toBeGreaterThanOrEqual(before);
		});
	});

	describe('getCountdownText', () => {
		it('should return null for CLOSED state', () => {
			state.state = 'CLOSED';
			expect(getCountdownText(state)).toBeNull();
		});

		it('should return null for HALF_OPEN state', () => {
			state.state = 'HALF_OPEN';
			expect(getCountdownText(state)).toBeNull();
		});

		it('should return "retrying..." when timeout expired', () => {
			state.state = 'OPEN';
			state.disabledUntil = Date.now() - 1000;
			expect(getCountdownText(state)).toBe('retrying...');
		});

		it('should return seconds countdown for < 60s', () => {
			state.state = 'OPEN';
			state.disabledUntil = Date.now() + 25000;
			const text = getCountdownText(state);
			expect(text).toMatch(/retry in \d+s/);
		});

		it('should return minutes countdown for >= 60s', () => {
			state.state = 'OPEN';
			state.disabledUntil = Date.now() + 120000;
			const text = getCountdownText(state);
			expect(text).toMatch(/retry in \d+m/);
		});
	});

	describe('State Machine Integration', () => {
		it('should follow CLOSED -> OPEN -> HALF_OPEN -> CLOSED lifecycle', () => {
			
			expect(state.state).toBe('CLOSED');

			
			const now = Date.now();
			state.failureWindow = [
				{ timestamp: now - 3000, error: 'e1' },
				{ timestamp: now - 2000, error: 'e2' }
			];
			state = recordFailure(state, 'e3');

			
			expect(state.state).toBe('OPEN');
			expect(state.disabledUntil).not.toBeNull();

			
			state.disabledUntil = Date.now() - 1;
			state = checkHalfOpenTransition(state);
			expect(state.state).toBe('HALF_OPEN');

			
			state = recordSuccess(state);
			expect(state.state).toBe('CLOSED');
		});

		it('should follow HALF_OPEN -> OPEN on failure', () => {
			state.state = 'HALF_OPEN';
			state = recordFailure(state, 'test failed');
			expect(state.state).toBe('OPEN');
		});
	});
});
