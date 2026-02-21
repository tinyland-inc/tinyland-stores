/**
 * Global Accessibility Store (Svelte 5 Runes)
 *
 * Manages accessibility evaluation orchestration with:
 * - Backend-first observability (always-on evaluation)
 * - Buffer management with backpressure
 * - Connection monitoring
 * - Continuous evaluation loop
 *
 * DEPENDENCY INJECTION: The AccessibilityOrchestrator must be provided
 * via configureGlobalAccessibility() before calling init().
 */
import { browser } from './env.js';
let _orchestratorFactory = null;
/**
 * Configure the accessibility orchestrator factory.
 * Must be called before globalAccessibility.init().
 */
export function configureGlobalAccessibility(factory) {
    _orchestratorFactory = factory;
}
// Global accessibility orchestrator store using Svelte 5 runes
class GlobalAccessibilityStore {
    #orchestrator = null;
    #connectionStatus = $state('Disconnected');
    #results = $state([]);
    #stats = $state({
        totalElements: 0,
        evaluatedElements: 0,
        issues: 0,
        criticalIssues: 0,
        evaluationTimeMs: 0,
        memoryUsageMB: 0
    });
    #lastUpdate = $state(null);
    #isAnalyzing = $state(false);
    #initialized = $state(false);
    #connectionCheckInterval = null;
    #evaluationInterval = null;
    get connectionStatus() { return this.#connectionStatus; }
    get results() { return this.#results; }
    get stats() { return this.#stats; }
    get lastUpdate() { return this.#lastUpdate; }
    get isAnalyzing() { return this.#isAnalyzing; }
    get initialized() { return this.#initialized; }
    setConnectionStatus(value) {
        if (this.#connectionStatus !== value) {
            console.log(`[GlobalAccessibility] Connection status changing: ${this.#connectionStatus} -> ${value}`);
            this.#connectionStatus = value;
        }
    }
    isConnected = $derived(this.#connectionStatus === 'Connected');
    connectionColor = $derived(this.isConnected ? 'text-success-600' : 'text-error-600');
    timeSinceUpdate = $derived(this.#lastUpdate ? Math.round((Date.now() - this.#lastUpdate.getTime()) / 1000) : 0);
    updateTimeText = $derived(this.#lastUpdate ? `${this.timeSinceUpdate}s ago` : 'Never');
    hasRecentResults = $derived(this.#results.length > 0 && this.timeSinceUpdate < 60);
    criticalIssueCount = $derived(this.#results.filter(r => r.severity === 'error').length);
    warningCount = $derived(this.#results.filter(r => r.severity === 'warning').length);
    liveFeedStatus = $derived(this.isConnected ? 'Active' : 'Inactive');
    score = $derived.by(() => {
        if (this.#stats.evaluatedElements === 0)
            return 100;
        const errorWeight = 10;
        const warningWeight = 5;
        const errorCount = this.#results.filter(r => r.severity === 'error').length;
        const warningCountVal = this.#results.filter(r => r.severity === 'warning').length;
        const deductions = (errorCount * errorWeight) + (warningCountVal * warningWeight);
        return Math.max(0, 100 - deductions);
    });
    resultsByType = $derived(() => {
        const grouped = new Map();
        this.#results.forEach(result => {
            const list = grouped.get(result.type) || [];
            list.push(result);
            grouped.set(result.type, list);
        });
        return grouped;
    });
    #config = {
        enabled: true,
        streamingEnabled: true,
        evaluationInterval: 0,
        samplingStrategy: {
            type: 'adaptive',
            maxElements: 50,
            throttleMs: 500
        },
        maxMemoryMB: 25,
        batchSize: 10,
        batchInterval: 100,
        viewportOnly: true
    };
    #initialLoadComplete = false;
    #userStartedMonitoring = false;
    #backpressureState = 'normal';
    handleResults = (newResults, newStats) => {
        const MAX_BUFFER_SIZE = 100;
        const HIGH_WATER_MARK = 80;
        const LOW_WATER_MARK = 40;
        const combinedResults = [...newResults, ...this.#results];
        this.#results = combinedResults.slice(0, MAX_BUFFER_SIZE);
        const client = this.#orchestrator?.client;
        if (client && 'emit' in client && typeof client.emit === 'function') {
            try {
                client.emit('accessibility:batch', {
                    results: newResults,
                    stats: newStats,
                    timestamp: Date.now()
                });
                this.clearTransmittedResults(newResults.length);
            }
            catch (error) {
                console.error('[GlobalAccessibility] Failed to ship results to backend:', error);
            }
        }
        const currentBufferSize = this.#results.length;
        if (currentBufferSize >= HIGH_WATER_MARK && this.#backpressureState === 'normal') {
            this.#backpressureState = 'high';
            this.emitBackpressure('high', currentBufferSize);
        }
        else if (currentBufferSize <= LOW_WATER_MARK && this.#backpressureState === 'high') {
            this.#backpressureState = 'normal';
            this.emitBackpressure('normal', currentBufferSize);
        }
        this.#stats = newStats;
        this.#lastUpdate = new Date();
    };
    clearTransmittedResults(count) {
        this.#results = this.#results.slice(0, Math.max(0, this.#results.length - count));
    }
    async init() {
        if (!browser || this.#initialized)
            return;
        if (!_orchestratorFactory) {
            console.warn('[GlobalAccessibility] No orchestrator factory configured. Call configureGlobalAccessibility() first.');
            return;
        }
        try {
            console.log('[GlobalAccessibility] Auto-starting evaluation for backend observability');
            this.#orchestrator = _orchestratorFactory(this.#config, this.handleResults);
            await this.#orchestrator.start();
            this.#initialized = true;
            this.startContinuousEvaluation();
            this.setupConnectionMonitoring();
            console.log('[GlobalAccessibility] Evaluation active');
        }
        catch (error) {
            console.error('[GlobalAccessibility] Failed to initialize:', error);
            this.#initialized = false;
            throw error;
        }
    }
    startContinuousEvaluation() {
        if (this.#evaluationInterval)
            return;
        this.#evaluationInterval = setInterval(() => {
            if (this.#orchestrator && this.#config.enabled) {
                this.#orchestrator.evaluate().catch((error) => {
                    console.error('[GlobalAccessibility] Continuous evaluation error:', error);
                });
            }
        }, 30000);
    }
    showMonitor() {
        this.#userStartedMonitoring = true;
        console.log('[GlobalAccessibility] Monitor opened - displaying buffer');
    }
    hideMonitor() {
        this.#userStartedMonitoring = false;
        console.log('[GlobalAccessibility] Monitor closed - evaluation continues in background');
    }
    setupConnectionMonitoring() {
        if (!this.#orchestrator)
            return;
        if (this.#orchestrator.client && 'on' in this.#orchestrator.client) {
            this.#orchestrator.client.on?.('connected', () => {
                this.setConnectionStatus('Connected');
            });
            this.#orchestrator.client.on?.('disconnected', () => {
                this.setConnectionStatus('Disconnected');
            });
        }
        if (!this.#connectionCheckInterval) {
            this.#connectionCheckInterval = setInterval(() => {
                const status = this.#orchestrator?.client?.getStatus?.();
                const isConn = status?.connected || false;
                this.setConnectionStatus(isConn ? 'Connected' : 'Disconnected');
            }, 5000);
        }
    }
    start() {
        console.warn('[GlobalAccessibility] start() is deprecated - evaluation is always-on. Use showMonitor() to display UI.');
        this.showMonitor();
    }
    stop() {
        console.warn('[GlobalAccessibility] stop() is deprecated - evaluation continues in background. Use hideMonitor() to hide UI.');
        this.hideMonitor();
    }
    async evaluate() {
        if (!this.#orchestrator || this.#isAnalyzing)
            return;
        if (!this.isConnected) {
            console.warn('[GlobalAccessibility] Circuit breaker: Skipping evaluation - not connected');
            return;
        }
        this.#isAnalyzing = true;
        try {
            await this.#orchestrator.evaluate();
        }
        catch (error) {
            console.error('[GlobalAccessibility] Evaluation error:', error);
        }
        finally {
            this.#isAnalyzing = false;
        }
    }
    highlightElement(selector) {
        try {
            if (!selector || typeof selector !== 'string')
                return;
            if (selector.length > 500)
                return;
            const cleanedSelector = selector
                .replace(/:(hidden|block|inline|flex|grid|table|inline-block|inline-flex|inline-grid)/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (!cleanedSelector)
                return;
            const element = document.querySelector(cleanedSelector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('accessibility-highlight');
                setTimeout(() => {
                    element.classList.remove('accessibility-highlight');
                }, 2000);
            }
        }
        catch (error) {
            console.error('[GlobalAccessibility] Highlight error:', error);
        }
    }
    get orchestratorInstance() { return this.#orchestrator; }
    get socket() { return this.#orchestrator?.client || null; }
    get client() { return this.#orchestrator?.client || null; }
    estimateBufferMemoryUsage() {
        const avgResultSizeBytes = 500;
        const totalBytes = this.#results.length * avgResultSizeBytes;
        return totalBytes / (1024 * 1024);
    }
    emitBackpressure(level, bufferSize) {
        if (!this.#orchestrator?.client)
            return;
        try {
            if ('emit' in this.#orchestrator.client) {
                this.#orchestrator.client.emit?.('buffer-pressure', {
                    level,
                    bufferSize,
                    timestamp: Date.now()
                });
            }
        }
        catch (error) {
            console.error('[GlobalAccessibility] Failed to emit backpressure signal:', error);
        }
    }
    destroy() {
        if (this.#evaluationInterval) {
            clearInterval(this.#evaluationInterval);
            this.#evaluationInterval = null;
        }
        if (this.#connectionCheckInterval) {
            clearInterval(this.#connectionCheckInterval);
            this.#connectionCheckInterval = null;
        }
        if (this.#orchestrator) {
            this.#orchestrator.stop();
            this.#orchestrator = null;
        }
        this.#backpressureState = 'normal';
    }
}
export const globalAccessibility = new GlobalAccessibilityStore();
