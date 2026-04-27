import type { ObservabilityClient } from '../types/trpc.js';
export declare function configureThemeStateObservability(client: ObservabilityClient): void;
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