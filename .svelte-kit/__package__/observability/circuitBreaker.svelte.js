import { browser } from '../env.js';
export function createCircuitBreaker() {
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
export function shouldOpenCircuitBreaker(state) {
    const failureWindow = state.failureWindow || [];
    const now = Date.now();
    const SIXTY_SECONDS = 60 * 1000;
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (failureWindow.length === 0)
        return false;
    const recentFailures = failureWindow.filter((f) => now - f.timestamp < FIVE_MINUTES);
    if (recentFailures.length >= 3) {
        const last5Attempts = recentFailures.slice(-5);
        const failuresIn5 = last5Attempts.length;
        if (failuresIn5 >= 3) {
            console.warn(`[A11y Circuit Breaker] Opening: ${failuresIn5}/5 recent attempts failed (60% failure rate)`);
            return true;
        }
    }
    if (recentFailures.length >= 5) {
        const lastSuccess = state.lastSuccessAt || 0;
        const oldestFailure = recentFailures[0].timestamp;
        if (oldestFailure > lastSuccess) {
            console.warn(`[A11y Circuit Breaker] Opening: ${recentFailures.length} consecutive failures (no successes)`);
            return true;
        }
    }
    const failuresInLast60s = recentFailures.filter((f) => now - f.timestamp < SIXTY_SECONDS);
    if (failuresInLast60s.length > 0) {
        const lastSuccess = state.lastSuccessAt || 0;
        const hasRecentSuccess = now - lastSuccess < SIXTY_SECONDS;
        if (!hasRecentSuccess && failuresInLast60s.length >= 2) {
            console.warn(`[A11y Circuit Breaker] Opening: ${failuresInLast60s.length} failures in 60s with no successes`);
            return true;
        }
    }
    return false;
}
export function getNextRetryTimeout(failureCount) {
    const baseTimeout = 30 * 1000;
    const maxTimeout = 5 * 60 * 1000;
    const timeout = Math.min(baseTimeout * Math.pow(2, failureCount - 1), maxTimeout);
    return timeout;
}
export function persistCircuitBreakerState(state) {
    if (!browser)
        return;
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
    }
    catch (error) {
        console.warn('[A11y Circuit Breaker] Failed to persist state:', error);
    }
}
export function loadCircuitBreakerState() {
    if (!browser)
        return null;
    try {
        const stored = localStorage.getItem('a11y_circuit_breaker');
        if (stored) {
            const parsed = JSON.parse(stored);
            console.info('[A11y Circuit Breaker] State restored from localStorage', parsed.state);
            logCircuitBreakerEvent('state_restored', parsed, {
                state: parsed.state,
                failureCount: parsed.failureWindow?.length || 0
            });
            return parsed;
        }
    }
    catch (error) {
        console.warn('[A11y Circuit Breaker] Failed to load state:', error);
    }
    return null;
}
export function logCircuitBreakerEvent(eventType, state, metadata = {}) {
    const event = {
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
export function recordSuccess(state) {
    const now = Date.now();
    state.lastSuccessAt = now;
    if (state.state === 'HALF_OPEN') {
        state.state = 'CLOSED';
        console.info('[A11y Circuit Breaker] Transitioning HALF_OPEN -> CLOSED (test succeeded)');
        logCircuitBreakerEvent('transition_closed_from_half_open', state, { successAt: now });
    }
    state.failures = 0;
    state.lastFailureTime = null;
    state.disabledUntil = null;
    persistCircuitBreakerState(state);
    return state;
}
export function recordFailure(state, error) {
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
        console.error(`[A11y Circuit Breaker] OPENING circuit for ${timeoutSeconds}s (failure pattern detected)`);
        logCircuitBreakerEvent('circuit_opened', state, {
            failureCount: state.failureWindow.length,
            timeout: timeoutSeconds,
            error
        });
    }
    else if (state.state === 'HALF_OPEN') {
        const timeout = getNextRetryTimeout(state.failures);
        state.state = 'OPEN';
        state.disabledUntil = now + timeout;
        const timeoutSeconds = Math.round(timeout / 1000);
        console.warn(`[A11y Circuit Breaker] HALF_OPEN test failed -> OPEN for ${timeoutSeconds}s`);
        logCircuitBreakerEvent('half_open_test_failed', state, {
            failureCount: state.failures,
            timeout: timeoutSeconds,
            error
        });
    }
    else {
        console.warn(`[A11y] Transient failure recorded (attempt ${state.failures}, circuit remains CLOSED)`);
    }
    persistCircuitBreakerState(state);
    return state;
}
export function checkHalfOpenTransition(state) {
    const now = Date.now();
    if (state.state === 'OPEN') {
        if (now >= (state.disabledUntil || 0)) {
            state.state = 'HALF_OPEN';
            console.info('[A11y Circuit Breaker] Transitioning OPEN -> HALF_OPEN (testing connection)');
            logCircuitBreakerEvent('transition_half_open', state, {
                disabledUntil: state.disabledUntil
            });
            persistCircuitBreakerState(state);
        }
    }
    return state;
}
export function manualResetCircuitBreaker(state) {
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
export function getCountdownText(state) {
    if (state.state !== 'OPEN' || !state.disabledUntil)
        return null;
    const now = Date.now();
    const remainingMs = state.disabledUntil - now;
    if (remainingMs <= 0)
        return 'retrying...';
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    if (remainingSeconds < 60) {
        return `retry in ${remainingSeconds}s`;
    }
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return `retry in ${remainingMinutes}m`;
}
