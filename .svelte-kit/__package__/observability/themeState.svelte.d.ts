/**
 * Theme State Observability Store
 *
 * Svelte 5 runes-based store for theme changes and hydration tracking.
 * Streams theme events via tRPC for observability.
 *
 * DEPENDENCY INJECTION: The tRPC observability client must be provided
 * via configureThemeStateObservability() before calling flush().
 *
 * Replaces: Socket.IO-based theme state streaming with delta compression
 * Benefits: Type-safe, reliable, no WebSocket complexity
 */
import type { ObservabilityClient } from '../types/trpc.js';
/**
 * Configure the observability client for theme state ingestion.
 * Must be called before themeStateStore.flush().
 */
export declare function configureThemeStateObservability(client: ObservabilityClient): void;
/**
 * Singleton theme state store instance
 */
export declare const themeStateStore: {
    readonly currentTheme: string | null;
    readonly previousTheme: string | null;
    readonly hydrationComplete: boolean;
    readonly hydrationDuration: number | null;
    readonly pendingEventsCount: number;
    readonly isHydrating: boolean;
    readonly hasTheme: boolean;
    startHydration: () => void;
    completeHydration: () => void;
    setTheme: (theme: string) => void;
    flush: () => Promise<void>;
    reset: () => void;
};
//# sourceMappingURL=themeState.svelte.d.ts.map