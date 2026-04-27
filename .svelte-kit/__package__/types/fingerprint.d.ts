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