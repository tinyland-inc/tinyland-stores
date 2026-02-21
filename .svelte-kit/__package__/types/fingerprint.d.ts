/**
 * Fingerprint settings type definition.
 *
 * Replaces the type-only import from $lib/server/services/FingerprintSettingsService.
 * This interface represents the server-provided fingerprint settings
 * used for theme initialization in the OTel-first architecture.
 */
export interface FingerprintSettings {
    fingerprint: string;
    preferences: {
        theme: string;
        darkMode: 'light' | 'dark' | 'system';
        reducedMotion: boolean;
        highContrast: boolean;
        fontSize: number;
        consent: {
            analytics: boolean;
            accessibility: boolean;
            functional: boolean;
        };
    };
    metadata: {
        firstSeen: string;
        lastSeen: string;
        visitCount: number;
    };
}
//# sourceMappingURL=fingerprint.d.ts.map