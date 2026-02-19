/**
 * tinyland-stores - Svelte 5 reactive stores extracted from the tinyland.dev monorepo.
 *
 * All stores use dependency injection for app-specific services.
 * Call the appropriate configure*() function during app initialization
 * before using stores that depend on external services.
 *
 * @module @tinyland-inc/tinyland-stores
 */

// =============================================================================
// Types
// =============================================================================
export type {
	ColorResult,
	ColorValue,
	ColorError
} from './types/color.js';

export type {
	EvaluationResult,
	EvaluationStats,
	EvaluationConfig,
	AccessibilityOrchestratorInterface,
	AccessibilityOrchestratorFactory
} from './types/accessibility.js';

export type {
	LoadingState,
	LoadingOrchestratorConfig,
	LoadingOrchestratorClass,
	LoadingOrchestratorFactory
} from './types/loading.js';

export type {
	TraceQLQueryInput,
	TRPCTraceQLResponse,
	TraceQLClient,
	ObservabilityClient,
	GetFingerprintFn,
	ContrastViolation,
	ContrastChecker,
	GetContrastCheckerFn
} from './types/trpc.js';

export type { FingerprintSettings } from './types/fingerprint.js';

// =============================================================================
// Environment
// =============================================================================
export { browser } from './env.js';

// =============================================================================
// Core Stores (no external dependencies)
// =============================================================================
export { csrfStore, getCSRFHeaders, validateCSRF, refreshCSRF } from './csrf.svelte.js';
export { loadingPhaseStore } from './loadingPhase.svelte.js';
export { clientMetrics } from './clientMetrics.svelte.js';

// =============================================================================
// Auth Store
// =============================================================================
export { authStore } from './auth.svelte.js';

// =============================================================================
// Auto-Refresh Store
// =============================================================================
export {
  registerRefresh,
  stopRefresh,
  pauseRefresh,
  resumeRefresh,
  pauseAll,
  resumeAll,
  stopAll,
  triggerRefresh,
  getRefreshStatus,
  getIntervalByPriority,
  type RefreshConfig
} from './auto-refresh.svelte.js';

// =============================================================================
// AutoSave Store (requires tinyland-composables)
// =============================================================================
export { autoSaveStore, getSaveStatus } from './autosave.svelte.js';

// =============================================================================
// Color Store (requires configureColorStore for OKLCH/OKLAB)
// =============================================================================
export {
	configureColorStore,
	createColorValue,
	createReactiveColor,
	createContrastCalculator
} from './colorStore.svelte.js';
export type { ColorUtilities } from './colorStore.svelte.js';

// =============================================================================
// Theme Store (no runtime deps, type-only fingerprint import)
// =============================================================================
export { themeStore } from './themeStore.svelte.js';

// =============================================================================
// Observability Store (legacy writable/derived)
// =============================================================================
export {
	observabilityStore,
	isInitialized,
	performanceMetrics,
	errors,
	recentErrors,
	userBehavior,
	hasErrors,
	errorCount,
	initObservability,
	trackError,
	trackBehavior,
	trackPageView,
	updateMetrics,
	setUserId,
	clearErrors,
	getObservabilitySummary,
	observabilityUtils
} from './observability.svelte.js';

// =============================================================================
// Global Accessibility Store (requires configureGlobalAccessibility)
// =============================================================================
export {
	configureGlobalAccessibility,
	globalAccessibility
} from './globalAccessibility.svelte.js';

// =============================================================================
// Loading Orchestrator Store (requires configureLoadingOrchestrator)
// =============================================================================
export {
	configureLoadingOrchestrator,
	loadingOrchestratorStore
} from './loadingOrchestrator.svelte.js';

// =============================================================================
// TraceQL Store (requires configureTraceQL)
// =============================================================================
export {
	configureTraceQL,
	traceql
} from './traceql.svelte.js';
export type { QueryState, QueryHistoryEntry } from './traceql.svelte.js';

// =============================================================================
// Observability Sub-stores
// =============================================================================

// Circuit Breaker
export {
	createCircuitBreaker,
	shouldOpenCircuitBreaker,
	getNextRetryTimeout,
	persistCircuitBreakerState,
	loadCircuitBreakerState,
	logCircuitBreakerEvent,
	recordSuccess,
	recordFailure,
	checkHalfOpenTransition,
	manualResetCircuitBreaker,
	getCountdownText
} from './observability/circuitBreaker.svelte.js';
export type {
	CircuitBreakerStateType,
	FailureEntry,
	CircuitBreakerState,
	CircuitBreakerEvent
} from './observability/circuitBreaker.svelte.js';

// A11y Observability Store (requires configureA11yStore)
export {
	configureA11yStore,
	a11yStore
} from './observability/a11y.svelte.js';
export type { A11yStoreDeps } from './observability/a11y.svelte.js';

// Client Metrics Observability Store (requires configureObservabilityMetrics)
export {
	configureObservabilityMetrics,
	metricsStore
} from './observability/clientMetrics.svelte.js';

// Theme State Observability Store (requires configureThemeStateObservability)
export {
	configureThemeStateObservability,
	themeStateStore
} from './observability/themeState.svelte.js';
