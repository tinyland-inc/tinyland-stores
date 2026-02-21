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
// Constants matching server-side configuration
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours (matches server)
const EXPIRY_THRESHOLD_MS = 30 * 60 * 1000; // Refresh 30 min before expiry
/**
 * Simple hash for token comparison (not cryptographic)
 * Used for cache-busting and change detection
 */
function hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}
/**
 * Read token from cookie (matches server cookie name)
 */
function readTokenFromCookie() {
    if (typeof document === 'undefined')
        return null;
    const cookies = document.cookie.split(';').map(c => c.trim());
    const csrfCookie = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`));
    if (csrfCookie) {
        const token = csrfCookie.split('=')[1];
        return decodeURIComponent(token);
    }
    return null;
}
/**
 * Create CSRF store singleton
 */
function createCSRFStore() {
    let state = $state({
        token: null,
        tokenHash: null,
        issuedAt: null,
        expiresAt: null,
        role: null
    });
    // Derived state - computed reactively
    const isValid = $derived(state.token !== null &&
        state.expiresAt !== null &&
        Date.now() < state.expiresAt);
    const isExpiringSoon = $derived(state.expiresAt !== null &&
        Date.now() > state.expiresAt - EXPIRY_THRESHOLD_MS);
    const timeUntilExpiry = $derived(state.expiresAt !== null
        ? Math.max(0, state.expiresAt - Date.now())
        : null);
    /**
     * Initialize token from server response or cookie
     */
    function initialize(token, role) {
        const now = Date.now();
        state = {
            token,
            tokenHash: hashToken(token),
            issuedAt: now,
            expiresAt: now + TOKEN_LIFETIME_MS,
            role: role ?? null
        };
    }
    /**
     * Fetch fresh token from server
     * Used for initial load and manual refresh
     */
    async function fetchToken() {
        try {
            // First try to read from cookie
            const cookieToken = readTokenFromCookie();
            if (cookieToken) {
                initialize(cookieToken);
                return cookieToken;
            }
            // If no cookie, request new token from server
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    initialize(data.token);
                    return data.token;
                }
            }
        }
        catch (error) {
            console.error('[CSRF Store] Failed to fetch token:', error);
        }
        return null;
    }
    /**
     * Rotate token on role change
     * Critical security feature to prevent privilege escalation
     */
    async function rotateOnRoleChange(newRole) {
        // Skip if role hasn't changed
        if (state.role === newRole) {
            return;
        }
        console.log(`[CSRF Store] Rotating token due to role change: ${state.role} -> ${newRole}`);
        try {
            // Request new token from server with role context
            const response = await fetch('/api/csrf-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    reason: 'role_change',
                    previousRole: state.role,
                    newRole
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    initialize(data.token, newRole);
                    console.log('[CSRF Store] Token rotated successfully');
                }
            }
            else {
                console.error('[CSRF Store] Failed to rotate token:', response.status);
            }
        }
        catch (error) {
            console.error('[CSRF Store] Token rotation error:', error);
        }
    }
    /**
     * Auto-refresh if token is expiring soon
     * Called before important operations
     */
    async function refreshIfNeeded() {
        if (!isExpiringSoon)
            return;
        console.log('[CSRF Store] Token expiring soon, refreshing');
        try {
            const response = await fetch('/api/csrf-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: 'refresh' })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    initialize(data.token, state.role ?? undefined);
                    console.log('[CSRF Store] Token refreshed successfully');
                }
            }
        }
        catch (error) {
            console.error('[CSRF Store] Token refresh error:', error);
            // Silent fail - will retry on next request
        }
    }
    /**
     * Get headers for fetch requests
     * Automatically includes CSRF token if valid
     */
    function getHeaders() {
        if (!state.token || !isValid) {
            console.warn('[CSRF Store] No valid token available for request');
            return {};
        }
        return { [CSRF_HEADER]: state.token };
    }
    /**
     * Validate token matches expected value
     * Used for manual verification
     */
    function validate(token) {
        if (!state.token)
            return false;
        return token === state.token && isValid;
    }
    /**
     * Clear token (on logout)
     * Also clears role to prevent stale state
     */
    function clear() {
        console.log('[CSRF Store] Clearing token');
        state = {
            token: null,
            tokenHash: null,
            issuedAt: null,
            expiresAt: null,
            role: null
        };
    }
    /**
     * Update role without rotating token
     * Used when role is set/updated but token doesn't need rotation
     */
    function setRole(role) {
        state.role = role;
    }
    return {
        // Reactive state (read-only getters)
        get token() { return state.token; },
        get isValid() { return isValid; },
        get isExpiringSoon() { return isExpiringSoon; },
        get role() { return state.role; },
        get timeUntilExpiry() { return timeUntilExpiry; },
        get expiresAt() { return state.expiresAt; },
        // Actions
        initialize,
        fetchToken,
        rotateOnRoleChange,
        refreshIfNeeded,
        getHeaders,
        validate,
        clear,
        setRole,
        // Constants (for external use)
        HEADER: CSRF_HEADER,
        COOKIE: CSRF_COOKIE
    };
}
// Singleton export
export const csrfStore = createCSRFStore();
// Named exports for specific functionality (convenience wrappers)
export const getCSRFHeaders = () => csrfStore.getHeaders();
export const validateCSRF = (token) => csrfStore.validate(token);
export const refreshCSRF = () => csrfStore.refreshIfNeeded();
