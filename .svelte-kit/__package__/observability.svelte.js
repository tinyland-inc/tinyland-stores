/**
 * Observability Store
 *
 * Svelte store for managing application observability with OpenTelemetry,
 * performance monitoring, and error tracking.
 *
 * Uses Svelte legacy writable/derived stores (not runes) for broader compatibility.
 */
import { writable, derived } from 'svelte/store';
// Default configuration
const defaultConfig = {
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    enableUserBehaviorTracking: true,
    enableConsoleCapture: true,
    maxErrors: 50,
    maxBehaviorEvents: 100,
    sampleRate: 1.0
};
// Initial state
function createInitialState() {
    const sessionId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return {
        sessionId,
        isInitialized: false,
        metrics: {
            pageLoad: 0,
            renderTime: 0
        },
        errors: [],
        behavior: {
            sessionId,
            events: [],
            startTime: Date.now(),
            lastActivity: Date.now(),
            pageViews: 0,
            clicks: 0,
            scrolls: 0,
            keyPresses: 0
        },
        config: { ...defaultConfig }
    };
}
// Create stores
export const observabilityStore = writable(createInitialState());
// Derived stores
export const isInitialized = derived(observabilityStore, ($state) => $state.isInitialized);
export const performanceMetrics = derived(observabilityStore, ($state) => $state.metrics);
export const errors = derived(observabilityStore, ($state) => $state.errors);
export const recentErrors = derived(errors, ($errors) => $errors.slice(-10));
export const userBehavior = derived(observabilityStore, ($state) => $state.behavior);
export const hasErrors = derived(errors, ($errors) => $errors.length > 0);
export const errorCount = derived(errors, ($errors) => $errors.length);
/**
 * Initialize observability
 */
export async function initObservability(config) {
    const state = createInitialState();
    if (config) {
        state.config = { ...state.config, ...config };
    }
    observabilityStore.set(state);
    if (typeof window === 'undefined')
        return;
    try {
        if (state.config.enablePerformanceMonitoring) {
            initPerformanceMonitoring();
        }
        if (state.config.enableErrorTracking) {
            initErrorTracking();
        }
        if (state.config.enableUserBehaviorTracking) {
            initBehaviorTracking();
        }
        if (state.config.enableConsoleCapture) {
            initConsoleCapture();
        }
        observabilityStore.update(current => ({
            ...current,
            isInitialized: true
        }));
    }
    catch (error) {
        console.error('[Observability] Failed to initialize:', error);
        trackError(error instanceof Error ? error : new Error('Unknown initialization error'), 'critical');
    }
}
function initPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.performance)
        return;
    window.addEventListener('load', () => {
        const navigation = window.performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const metrics = {
                pageLoad: navigation.loadEventEnd - navigation.loadEventStart,
                ttfb: navigation.responseStart - navigation.requestStart,
            };
            updateMetrics(metrics);
        }
        const paintEntries = window.performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
                updateMetrics({ firstContentfulPaint: entry.startTime });
            }
        });
    });
}
function initErrorTracking() {
    if (typeof window === 'undefined')
        return;
    window.addEventListener('error', (event) => {
        trackError(event.error || new Error(event.message), 'high', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    window.addEventListener('unhandledrejection', (event) => {
        trackError(event.reason || new Error('Unhandled promise rejection'), 'critical', {
            type: 'unhandledrejection'
        });
    });
}
function initBehaviorTracking() {
    if (typeof document === 'undefined')
        return;
    trackPageView();
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event.target);
        trackBehavior('click', target, {
            x: event.clientX,
            y: event.clientY
        });
    });
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            trackBehavior('scroll', window.location.href, {
                scrollY: window.scrollY,
                scrollX: window.scrollX
            });
        }, 100);
    }, { passive: true });
    document.addEventListener('keydown', () => {
        trackBehavior('keypress', window.location.href);
    });
}
function initConsoleCapture() {
    if (typeof console === 'undefined')
        return;
    const originalError = console.error;
    console.error = (...args) => {
        originalError.apply(console, args);
        if (args[0] instanceof Error) {
            trackError(args[0], 'medium', { source: 'console' });
        }
        else if (typeof args[0] === 'string') {
            trackError(new Error(args[0]), 'medium', { source: 'console', args });
        }
    };
    const originalWarn = console.warn;
    console.warn = (...args) => {
        originalWarn.apply(console, args);
        if (args[0] instanceof Error) {
            trackError(args[0], 'low', { source: 'console' });
        }
        else if (typeof args[0] === 'string') {
            trackError(new Error(args[0]), 'low', { source: 'console', args });
        }
    };
}
export function trackError(error, severity = 'medium', context) {
    observabilityStore.update(current => {
        const errorInfo = {
            id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            message: typeof error === 'string' ? error : error.message,
            stack: typeof error === 'string' ? undefined : error.stack,
            timestamp: Date.now(),
            url: typeof window !== 'undefined' ? window.location.href : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            sessionId: current.sessionId,
            userId: current.userId,
            severity,
            context
        };
        const updatedErrors = [...current.errors, errorInfo];
        if (updatedErrors.length > current.config.maxErrors) {
            updatedErrors.splice(0, updatedErrors.length - current.config.maxErrors);
        }
        return {
            ...current,
            errors: updatedErrors
        };
    });
}
export function trackBehavior(type, target, data) {
    observabilityStore.update(current => {
        const event = {
            type,
            timestamp: Date.now(),
            target,
            data
        };
        const updatedEvents = [...current.behavior.events, event];
        if (updatedEvents.length > current.config.maxBehaviorEvents) {
            updatedEvents.splice(0, updatedEvents.length - current.config.maxBehaviorEvents);
        }
        const updatedBehavior = {
            ...current.behavior,
            events: updatedEvents,
            lastActivity: Date.now(),
            clicks: type === 'click' ? current.behavior.clicks + 1 : current.behavior.clicks,
            scrolls: type === 'scroll' ? current.behavior.scrolls + 1 : current.behavior.scrolls,
            keyPresses: type === 'keypress' ? current.behavior.keyPresses + 1 : current.behavior.keyPresses
        };
        return {
            ...current,
            behavior: updatedBehavior
        };
    });
}
export function trackPageView(url) {
    observabilityStore.update(current => ({
        ...current,
        behavior: {
            ...current.behavior,
            pageViews: current.behavior.pageViews + 1,
            lastActivity: Date.now()
        }
    }));
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    trackBehavior('pageview', currentUrl);
}
export function updateMetrics(metrics) {
    observabilityStore.update(current => ({
        ...current,
        metrics: {
            ...current.metrics,
            ...metrics
        }
    }));
}
export function setUserId(userId) {
    observabilityStore.update(current => ({
        ...current,
        userId,
        behavior: {
            ...current.behavior,
            userId
        }
    }));
}
export function clearErrors() {
    observabilityStore.update(current => ({
        ...current,
        errors: []
    }));
}
export function getObservabilitySummary() {
    let state = createInitialState();
    observabilityStore.subscribe(s => state = s)();
    return {
        sessionId: state.sessionId,
        userId: state.userId,
        isInitialized: state.isInitialized,
        errorCount: state.errors.length,
        eventCount: state.behavior.events.length,
        pageViews: state.behavior.pageViews,
        uptime: Date.now() - state.behavior.startTime,
        lastActivity: state.behavior.lastActivity,
        metrics: state.metrics,
        recentErrors: state.errors.slice(-5),
        config: state.config
    };
}
function getEventTarget(target) {
    if (target instanceof Element) {
        return `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ''}${target.className ? `.${target.className.split(' ').join('.')}` : ''}`;
    }
    return 'unknown';
}
export const observabilityUtils = {
    getErrorDistribution: () => {
        let state = createInitialState();
        observabilityStore.subscribe(s => state = s)();
        const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
        state.errors.forEach(error => {
            distribution[error.severity]++;
        });
        return distribution;
    },
    getBehaviorSummary: () => {
        let state = createInitialState();
        observabilityStore.subscribe(s => state = s)();
        return {
            totalEvents: state.behavior.events.length,
            pageViews: state.behavior.pageViews,
            clicks: state.behavior.clicks,
            scrolls: state.behavior.scrolls,
            keyPresses: state.behavior.keyPresses,
            sessionDuration: Date.now() - state.behavior.startTime,
            averageEventsPerMinute: state.behavior.events.length / ((Date.now() - state.behavior.startTime) / 60000)
        };
    },
    exportData: () => {
        const summary = getObservabilitySummary();
        const errorDistribution = observabilityUtils.getErrorDistribution();
        const behaviorSummary = observabilityUtils.getBehaviorSummary();
        return {
            summary,
            errorDistribution,
            behaviorSummary,
            timestamp: new Date().toISOString()
        };
    }
};
