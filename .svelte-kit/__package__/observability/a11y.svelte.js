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
import { browser } from '../env.js';
import { createCircuitBreaker, loadCircuitBreakerState, recordSuccess, recordFailure, checkHalfOpenTransition, manualResetCircuitBreaker, getCountdownText } from './circuitBreaker.svelte.js';
let _deps = null;
/**
 * Configure the A11y store dependencies.
 * Must be called before the store auto-initializes.
 */
export function configureA11yStore(deps) {
    _deps = deps;
}
/**
 * Create reactive a11y store
 * Uses $state rune for reactivity
 */
function createA11yStore() {
    const loadedCircuitBreaker = loadCircuitBreakerState() || createCircuitBreaker();
    let state = $state({
        violations: [],
        isEvaluating: false,
        lastEvaluationTime: null,
        pendingQueue: [],
        isConnected: false,
        isTesting: false,
        lastError: null,
        lastSuccessfulFlush: null,
        connectionTests: {
            total: 0,
            successful: 0,
            lastTestTime: null
        },
        circuitBreaker: loadedCircuitBreaker,
        fingerprint: null,
        a11yFingerprint: null,
        disabled: {
            fingerprint: null,
            disabledAt: null,
            reason: null,
            expiresAt: null
        },
        contrastViolations: [],
        lastContrastScanTime: null,
        isContrastScanning: false
    });
    const violationCount = $derived(state.violations.length);
    const hasCritical = $derived(state.violations.some((v) => v.impact === 'critical'));
    const hasSerious = $derived(state.violations.some((v) => v.impact === 'serious'));
    /**
     * Queue violations for ingestion
     */
    function queueViolations(violations) {
        state.pendingQueue.push(...violations);
        state.violations = [...state.violations, ...violations];
    }
    /**
     * Flush pending violations to server via tRPC
     */
    async function flush() {
        if (state.pendingQueue.length === 0)
            return;
        if (!_deps) {
            console.warn('[A11y] Dependencies not configured. Call configureA11yStore() first.');
            return;
        }
        state.circuitBreaker = checkHalfOpenTransition(state.circuitBreaker);
        if (state.circuitBreaker.state === 'OPEN') {
            const countdownText = getCountdownText(state.circuitBreaker);
            console.log(`[A11y] Circuit breaker open, skipping flush (${countdownText})`);
            return;
        }
        const toSend = [...state.pendingQueue];
        state.pendingQueue = [];
        const traceApi = _deps.traceApi;
        const spanStatusCode = _deps.spanStatusCode || { OK: 1, ERROR: 2 };
        const tracer = traceApi?.getTracer('a11y-store');
        const span = tracer?.startSpan('a11y.flush');
        try {
            if (span?.isRecording()) {
                const criticalCount = toSend.filter(v => v.impact === 'critical').length;
                const seriousCount = toSend.filter(v => v.impact === 'serious').length;
                const moderateCount = toSend.filter(v => v.impact === 'moderate').length;
                const minorCount = toSend.filter(v => v.impact === 'minor').length;
                span.setAttribute('a11y.violation_count', toSend.length);
                span.setAttribute('a11y.violation_critical', criticalCount);
                span.setAttribute('a11y.violation_serious', seriousCount);
                span.setAttribute('a11y.violation_moderate', moderateCount);
                span.setAttribute('a11y.violation_minor', minorCount);
                if (state.a11yFingerprint) {
                    span.setAttribute('a11y.screen_reader_detected', state.a11yFingerprint.screenReader?.detected || false);
                    span.setAttribute('a11y.reduced_motion_enabled', state.a11yFingerprint.preferences?.reducedMotion || false);
                    span.setAttribute('a11y.high_contrast_enabled', state.a11yFingerprint.preferences?.highContrast || false);
                    span.setAttribute('a11y.wcag_level', 'AA');
                }
                if (state.fingerprint) {
                    span.setAttribute('fingerprint.id', state.fingerprint);
                }
            }
            await _deps.observabilityClient.ingestA11y(typeof window !== 'undefined' ? window.location.href : '', toSend, state.a11yFingerprint);
            console.log(`[A11y] Flushed ${toSend.length} violations to server`);
            state.circuitBreaker = recordSuccess(state.circuitBreaker);
            state.isConnected = true;
            state.lastError = null;
            state.lastSuccessfulFlush = Date.now();
            state.violations = state.violations.filter(v => !toSend.some(sent => sent.id === v.id));
            span?.setStatus({ code: spanStatusCode.OK });
        }
        catch (error) {
            console.error('[A11y] Failed to flush violations:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (span?.isRecording()) {
                span.setStatus({
                    code: spanStatusCode.ERROR,
                    message: errorMessage
                });
                span.recordException(error);
            }
            state.circuitBreaker = recordFailure(state.circuitBreaker, errorMessage);
            if (state.circuitBreaker.failures >= 5 && state.circuitBreaker.state === 'OPEN') {
                disableA11y('Repeated tRPC failures - circuit breaker opened', 24);
                state.pendingQueue = [];
            }
            state.isConnected = false;
            state.lastError = errorMessage;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Run a11y evaluation and send results
     */
    async function evaluate(element = document.body) {
        if (isDisabled()) {
            console.debug('[A11y] Monitoring disabled for this fingerprint');
            return;
        }
        if (state.isEvaluating) {
            console.warn('[A11y] Evaluation already in progress, skipping');
            return;
        }
        state.isEvaluating = true;
        try {
            const axe = await import('axe-core');
            const results = await axe.default.run(element);
            if (results.violations.length > 0) {
                queueViolations(results.violations);
                if (state.pendingQueue.length >= 10) {
                    await flush();
                }
            }
            state.lastEvaluationTime = Date.now();
        }
        catch (error) {
            console.error('[A11y] Evaluation failed:', error);
        }
        finally {
            state.isEvaluating = false;
        }
    }
    /**
     * Scan page for contrast violations
     */
    async function scanContrast(targetLevel = 'aa') {
        if (!browser || state.isContrastScanning || !_deps)
            return;
        state.isContrastScanning = true;
        try {
            const checker = _deps.getContrastChecker();
            const violations = checker.scanPage({ targetLevel });
            state.contrastViolations = violations;
            state.lastContrastScanTime = Date.now();
            if (violations.length > 0) {
                const summary = checker.getSummary();
                const tracer = _deps.traceApi?.getTracer('a11y-store');
                const span = tracer?.startSpan('a11y.contrast_scan');
                if (span?.isRecording()) {
                    span.setAttribute('contrast.violation_count', violations.length);
                    span.setAttribute('contrast.worst_ratio', summary.worstRatio);
                    span.setAttribute('contrast.average_ratio', summary.averageRatio);
                    span.setAttribute('contrast.target_level', targetLevel);
                }
                span?.end();
                console.warn(`[A11y Contrast] Found ${violations.length} contrast violations (worst ratio: ${summary.worstRatio.toFixed(2)})`);
            }
        }
        catch (error) {
            console.error('[A11y Contrast] Scan failed:', error);
        }
        finally {
            state.isContrastScanning = false;
        }
    }
    function clear() {
        state.violations = [];
        state.pendingQueue = [];
        state.contrastViolations = [];
    }
    async function testConnection() {
        if (!_deps)
            return false;
        state.isTesting = true;
        state.connectionTests.total++;
        try {
            await _deps.observabilityClient.ingestA11y(typeof window !== 'undefined' ? window.location.href : '', []);
            state.isConnected = true;
            state.lastError = null;
            state.connectionTests.successful++;
            state.connectionTests.lastTestTime = Date.now();
            console.log('[A11y] Connection test successful');
            return true;
        }
        catch (error) {
            state.isConnected = false;
            state.lastError = error instanceof Error ? error.message : 'Connection test failed';
            console.error('[A11y] Connection test failed:', error);
            return false;
        }
        finally {
            state.isTesting = false;
        }
    }
    async function initializeFingerprint() {
        if (!browser || !_deps)
            return;
        try {
            state.fingerprint = await _deps.getFingerprint();
            console.info('[A11y] Fingerprint initialized:', state.fingerprint);
            state.a11yFingerprint = detectA11yFingerprint();
            console.info('[A11y] A11y fingerprint detected:', state.a11yFingerprint);
        }
        catch (error) {
            console.error('[A11y] Failed to initialize fingerprint:', error);
        }
    }
    function detectA11yFingerprint() {
        if (!browser)
            return null;
        return {
            screenReader: {
                detected: false,
                type: null
            },
            preferences: {
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                highContrast: window.matchMedia('(prefers-contrast: high)').matches,
                forcedColors: window.matchMedia('(forced-colors: active)').matches,
                darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
            }
        };
    }
    function isDisabled() {
        if (!browser || !state.fingerprint)
            return false;
        const disabledKey = `a11y-disabled-${state.fingerprint}`;
        const disabledData = localStorage.getItem(disabledKey);
        if (disabledData) {
            try {
                const parsed = JSON.parse(disabledData);
                if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
                    return true;
                }
                localStorage.removeItem(disabledKey);
            }
            catch (error) {
                console.error('[A11y] Failed to parse disabled data:', error);
            }
        }
        return !!(state.disabled.fingerprint === state.fingerprint &&
            state.disabled.expiresAt &&
            Date.now() < state.disabled.expiresAt);
    }
    function disableA11y(reason, hours = 24) {
        if (!browser || !state.fingerprint)
            return;
        const expiresAt = Date.now() + (hours * 60 * 60 * 1000);
        state.disabled = {
            fingerprint: state.fingerprint,
            disabledAt: Date.now(),
            reason,
            expiresAt
        };
        const disabledKey = `a11y-disabled-${state.fingerprint}`;
        localStorage.setItem(disabledKey, JSON.stringify({
            fingerprint: state.fingerprint,
            disabledAt: Date.now(),
            reason,
            expiresAt
        }));
        console.warn(`[A11y] Monitoring disabled for fingerprint ${state.fingerprint}: ${reason} (expires ${new Date(expiresAt).toISOString()})`);
    }
    async function handleNetworkRecovery() {
        console.info('[A11y] Network recovered, attempting circuit breaker recovery...');
        if (state.circuitBreaker.state === 'CLOSED') {
            console.debug('[A11y] Circuit breaker already closed, no recovery needed');
            return;
        }
        const success = await testConnection();
        if (success) {
            state.circuitBreaker = recordSuccess(state.circuitBreaker);
            console.info('[A11y] Circuit breaker recovered successfully');
        }
        else {
            console.warn('[A11y] Network recovery test failed, circuit breaker remains open');
        }
    }
    function resetCircuitBreaker() {
        console.warn('[A11y] Manual circuit breaker reset initiated');
        state.circuitBreaker = manualResetCircuitBreaker(state.circuitBreaker);
    }
    async function initialize() {
        if (!browser) {
            console.debug('[A11y] Skipping initialization on server (SSR)');
            return;
        }
        console.info('[A11y] Initializing store on client');
        await initializeFingerprint();
        window.addEventListener('online', handleNetworkRecovery);
        console.debug('[A11y] Network recovery listener registered');
        await testConnection();
        console.info('[A11y] Initial connection test completed');
    }
    if (browser && _deps) {
        initialize();
    }
    return {
        get violations() { return state.violations; },
        get isEvaluating() { return state.isEvaluating; },
        get lastEvaluationTime() { return state.lastEvaluationTime; },
        get pendingQueueSize() { return state.pendingQueue.length; },
        get isConnected() { return state.isConnected; },
        get isTesting() { return state.isTesting; },
        get lastError() { return state.lastError; },
        get lastSuccessfulFlush() { return state.lastSuccessfulFlush; },
        get connectionTests() { return state.connectionTests; },
        get circuitBreaker() { return state.circuitBreaker; },
        get fingerprint() { return state.fingerprint; },
        get a11yFingerprint() { return state.a11yFingerprint; },
        get disabled() { return state.disabled; },
        get contrastViolations() { return state.contrastViolations; },
        get lastContrastScanTime() { return state.lastContrastScanTime; },
        get isContrastScanning() { return state.isContrastScanning; },
        get violationCount() { return violationCount; },
        get hasCritical() { return hasCritical; },
        get hasSerious() { return hasSerious; },
        evaluate,
        queueViolations,
        flush,
        testConnection,
        clear,
        initialize,
        initializeFingerprint,
        detectA11yFingerprint,
        isDisabled,
        disableA11y,
        resetCircuitBreaker,
        scanContrast
    };
}
/**
 * Singleton a11y store instance with SSR safety
 */
let _storeInstance = null;
function getA11yStore() {
    if (!browser) {
        return createMockA11yStore();
    }
    if (!_storeInstance) {
        console.info('[A11y] Creating singleton store instance');
        _storeInstance = createA11yStore();
    }
    return _storeInstance;
}
/**
 * Mock store for SSR (all methods are no-ops)
 */
function createMockA11yStore() {
    const noop = () => { };
    const noopAsync = async () => { };
    const noopAsyncBool = async () => false;
    return {
        get violations() { return []; },
        get isEvaluating() { return false; },
        get lastEvaluationTime() { return null; },
        get pendingQueueSize() { return 0; },
        get isConnected() { return false; },
        get isTesting() { return false; },
        get lastError() { return null; },
        get lastSuccessfulFlush() { return null; },
        get connectionTests() { return { total: 0, successful: 0, lastTestTime: null }; },
        get circuitBreaker() { return { state: 'CLOSED', failures: 0, lastFailureTime: null, disabledUntil: null, failureWindow: [], lastSuccessAt: null, manualResetCount: 0, lastManualResetAt: null }; },
        get fingerprint() { return null; },
        get a11yFingerprint() { return null; },
        get disabled() { return { fingerprint: null, disabledAt: null, reason: null, expiresAt: null }; },
        get contrastViolations() { return []; },
        get lastContrastScanTime() { return null; },
        get isContrastScanning() { return false; },
        get violationCount() { return 0; },
        get hasCritical() { return false; },
        get hasSerious() { return false; },
        evaluate: noopAsync,
        queueViolations: noop,
        flush: noopAsync,
        testConnection: noopAsyncBool,
        clear: noop,
        initialize: noopAsync,
        initializeFingerprint: noopAsync,
        detectA11yFingerprint: () => null,
        isDisabled: () => false,
        disableA11y: noop,
        resetCircuitBreaker: noop,
        scanContrast: noopAsync
    };
}
/**
 * Export singleton instance
 * Safe for both SSR and client-side usage
 */
export const a11yStore = getA11yStore();
