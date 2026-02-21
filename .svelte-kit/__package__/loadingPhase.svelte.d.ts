/**
 * Loading Phase Store - Svelte 5 Runes
 *
 * Tracks loading progress through phases that mirror the OTel-first architecture:
 *
 * SERVER-SIDE (already completed by render time):
 * 1. fingerprintSettingsHandle -> queries Tempo for fingerprint settings
 * 2. consentCheckHandle -> restores consent from Tempo OR cookies
 * 3. referrerEnrichmentHandle -> enriches referrer with ActivityPub/UTM/etc.
 *
 * CLIENT-SIDE (hydration phases this store tracks):
 * 1. 'detecting-fingerprint' -> checking server data for fingerprint
 * 2. 'waiting-for-tempo' -> polling Tempo if unavailable (retry loop)
 * 3. 'restoring-preferences' -> applying Tempo-restored or default settings
 * 4. 'loading-theme' -> hydrating theme from server settings
 * 5. 'starting-services' -> metrics, tRPC, navigation tracking
 * 6. 'loading-a11y' -> conditionally loading a11y components
 * 7. 'ready' -> app fully hydrated
 */
export type LoadingPhase = 'detecting-fingerprint' | 'waiting-for-tempo' | 'restoring-preferences' | 'loading-theme' | 'starting-services' | 'connecting-trpc' | 'loading-a11y' | 'ready';
declare class LoadingPhaseStore {
    private state;
    get phase(): LoadingPhase;
    get progress(): number;
    get message(): string;
    get isReady(): boolean;
    /** Whether settings were restored from Tempo (returning visitor) */
    get restoredFromTempo(): boolean;
    /**
     * Set whether settings were restored from Tempo
     * Called after checking server data for fingerprint settings
     */
    setRestoredFromTempo(restored: boolean): void;
    /**
     * Set Tempo polling state with retry count
     * Shows current retry attempt and max retries in the message
     */
    setTempoPolling(retryCount: number, maxRetries: number): void;
    setPhase(phase: LoadingPhase): void;
    setProgress(progress: number): void;
    markReady(): void;
}
export declare const loadingPhaseStore: LoadingPhaseStore;
export {};
//# sourceMappingURL=loadingPhase.svelte.d.ts.map