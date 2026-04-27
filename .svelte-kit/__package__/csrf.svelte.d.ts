export declare const csrfStore: {
    readonly token: string | null;
    readonly isValid: boolean;
    readonly isExpiringSoon: boolean;
    readonly role: string | null;
    readonly timeUntilExpiry: number | null;
    readonly expiresAt: number | null;
    initialize: (token: string, role?: string) => void;
    fetchToken: () => Promise<string | null>;
    rotateOnRoleChange: (newRole: string) => Promise<void>;
    refreshIfNeeded: () => Promise<void>;
    getHeaders: () => Record<string, string>;
    validate: (token: string) => boolean;
    clear: () => void;
    setRole: (role: string | null) => void;
    HEADER: string;
    COOKIE: string;
};
export declare const getCSRFHeaders: () => Record<string, string>;
export declare const validateCSRF: (token: string) => boolean;
export declare const refreshCSRF: () => Promise<void>;
//# sourceMappingURL=csrf.svelte.d.ts.map