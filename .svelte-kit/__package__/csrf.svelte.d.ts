/**
 * CSRF Token Store - Unified Svelte 5 Runes Implementation
 *
 * Single source of truth for CSRF protection with:
 * - Automatic token rotation on role change
 * - Token expiration tracking and auto-refresh
 * - Session-aware token management
 * - Proper security attributes
 *
 * Architecture:
 * - Client-side reactive store using Svelte 5 runes
 * - Integrates with server middleware for validation
 * - Tokens stored in httpOnly cookies for security
 * - Client reads from cookie and validates expiration
 */
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