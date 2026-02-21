/**
 * Observability Store
 *
 * Svelte store for managing application observability with OpenTelemetry,
 * performance monitoring, and error tracking.
 *
 * Uses Svelte legacy writable/derived stores (not runes) for broader compatibility.
 */
interface PerformanceMetrics {
    pageLoad: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
    firstInputDelay?: number;
    memoryUsage?: number;
    renderTime: number;
    ttfb?: number;
}
interface ErrorInfo {
    id: string;
    message: string;
    stack?: string;
    timestamp: number;
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
}
interface UserBehavior {
    sessionId: string;
    userId?: string;
    events: BehaviorEvent[];
    startTime: number;
    lastActivity: number;
    pageViews: number;
    clicks: number;
    scrolls: number;
    keyPresses: number;
}
interface BehaviorEvent {
    type: 'click' | 'scroll' | 'keypress' | 'pageview' | 'hover' | 'focus' | 'blur';
    timestamp: number;
    target: string;
    data?: Record<string, any>;
}
interface ObservabilityState {
    sessionId: string;
    userId?: string;
    isInitialized: boolean;
    metrics: PerformanceMetrics;
    errors: ErrorInfo[];
    behavior: UserBehavior;
    config: ObservabilityConfig;
}
interface ObservabilityConfig {
    enablePerformanceMonitoring: boolean;
    enableErrorTracking: boolean;
    enableUserBehaviorTracking: boolean;
    enableConsoleCapture: boolean;
    maxErrors: number;
    maxBehaviorEvents: number;
    sampleRate: number;
    endpoint?: string;
    apiKey?: string;
}
export declare const observabilityStore: import("svelte/store").Writable<ObservabilityState>;
export declare const isInitialized: import("svelte/store").Readable<boolean>;
export declare const performanceMetrics: import("svelte/store").Readable<PerformanceMetrics>;
export declare const errors: import("svelte/store").Readable<ErrorInfo[]>;
export declare const recentErrors: import("svelte/store").Readable<ErrorInfo[]>;
export declare const userBehavior: import("svelte/store").Readable<UserBehavior>;
export declare const hasErrors: import("svelte/store").Readable<boolean>;
export declare const errorCount: import("svelte/store").Readable<number>;
/**
 * Initialize observability
 */
export declare function initObservability(config?: Partial<ObservabilityConfig>): Promise<void>;
export declare function trackError(error: Error | string, severity?: ErrorInfo['severity'], context?: Record<string, any>): void;
export declare function trackBehavior(type: BehaviorEvent['type'], target: string, data?: Record<string, any>): void;
export declare function trackPageView(url?: string): void;
export declare function updateMetrics(metrics: Partial<PerformanceMetrics>): void;
export declare function setUserId(userId: string): void;
export declare function clearErrors(): void;
export declare function getObservabilitySummary(): {
    sessionId: string;
    userId: string | undefined;
    isInitialized: boolean;
    errorCount: number;
    eventCount: number;
    pageViews: number;
    uptime: number;
    lastActivity: number;
    metrics: PerformanceMetrics;
    recentErrors: ErrorInfo[];
    config: ObservabilityConfig;
};
export declare const observabilityUtils: {
    getErrorDistribution: () => {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
    getBehaviorSummary: () => {
        totalEvents: number;
        pageViews: number;
        clicks: number;
        scrolls: number;
        keyPresses: number;
        sessionDuration: number;
        averageEventsPerMinute: number;
    };
    exportData: () => {
        summary: {
            sessionId: string;
            userId: string | undefined;
            isInitialized: boolean;
            errorCount: number;
            eventCount: number;
            pageViews: number;
            uptime: number;
            lastActivity: number;
            metrics: PerformanceMetrics;
            recentErrors: ErrorInfo[];
            config: ObservabilityConfig;
        };
        errorDistribution: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
        behaviorSummary: {
            totalEvents: number;
            pageViews: number;
            clicks: number;
            scrolls: number;
            keyPresses: number;
            sessionDuration: number;
            averageEventsPerMinute: number;
        };
        timestamp: string;
    };
};
export {};
//# sourceMappingURL=observability.svelte.d.ts.map