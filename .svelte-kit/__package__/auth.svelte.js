/**
 * Authentication Store (Svelte 5 Runes)
 *
 * Manages authentication user state with:
 * - Session persistence via localStorage (display data only)
 * - httpOnly cookie-based sessionId (server-validated)
 * - Periodic session validity checks
 * - Reactive getters for components
 */
import { browser } from './env.js';
class AuthStore {
    // Private state using Svelte 5 runes
    #session = $state(null);
    #isLoading = $state(true);
    #lastCheck = $state(null);
    // Storage key
    STORAGE_KEY = 'stonewall_auth_session';
    CHECK_INTERVAL = 60000; // Check every minute
    checkInterval = null;
    constructor() {
        if (browser) {
            this.init();
        }
    }
    // Getters for reactive state
    get session() { return this.#session; }
    get user() { return this.#session?.user || null; }
    get isAuthenticated() { return !!this.#session; }
    get isLoading() { return this.#isLoading; }
    get isAdmin() {
        return this.#session?.user?.role === 'admin' ||
            this.#session?.user?.role === 'super_admin';
    }
    get isSuperAdmin() { return this.#session?.user?.role === 'super_admin'; }
    // Initialize from localStorage
    // NOTE: We only store user display data here, NOT the sessionId
    // The sessionId is stored in an httpOnly cookie for security
    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Check if session is expired
                if (new Date(data.expires) > new Date()) {
                    // Reconstruct session with placeholder sessionId
                    // The real sessionId is in httpOnly cookie and validated server-side
                    this.#session = {
                        user: data.user,
                        expires: data.expires,
                        sessionId: '[httpOnly]' // Placeholder - real ID in cookie
                    };
                    console.log('[AuthStore] Restored user from localStorage:', data.user.name);
                    // Start periodic checks (validates via server)
                    this.startPeriodicCheck();
                }
                else {
                    console.log('[AuthStore] Stored session expired, clearing');
                    this.clearSession();
                }
            }
        }
        catch (error) {
            console.error('[AuthStore] Failed to restore session:', error);
            this.clearSession();
        }
        finally {
            this.#isLoading = false;
        }
    }
    // Set session (called after successful login)
    // SECURITY: Only stores user display data in localStorage, NOT sessionId
    // The sessionId must be passed via httpOnly cookie for auth
    setSession(session) {
        this.#session = session;
        if (browser) {
            try {
                // SECURITY FIX: Only store user display data, NOT sessionId
                // The sessionId lives in httpOnly cookies only to prevent XSS theft
                const storedData = {
                    user: session.user,
                    expires: session.expires
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));
                console.log('[AuthStore] User data stored in localStorage (sessionId in httpOnly cookie)');
                // Start periodic checks
                this.startPeriodicCheck();
            }
            catch (error) {
                console.error('[AuthStore] Failed to store session:', error);
            }
        }
    }
    // Clear session (logout)
    clearSession() {
        this.#session = null;
        if (browser) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.stopPeriodicCheck();
        }
    }
    // Check if session is still valid
    async checkSession() {
        if (!this.#session)
            return false;
        // Check local expiry first
        if (new Date(this.#session.expires) <= new Date()) {
            console.log('[AuthStore] Session expired');
            this.clearSession();
            return false;
        }
        // Verify with server - sessionId is sent via httpOnly cookie automatically
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                credentials: 'include', // Sends httpOnly cookies
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                console.log('[AuthStore] Session invalid on server');
                this.clearSession();
                return false;
            }
            this.#lastCheck = new Date();
            return true;
        }
        catch (error) {
            console.error('[AuthStore] Failed to verify session:', error);
            // Keep session if we can't reach server
            return true;
        }
    }
    // Start periodic session checks
    startPeriodicCheck() {
        if (this.checkInterval)
            return;
        this.checkInterval = setInterval(() => {
            this.checkSession();
        }, this.CHECK_INTERVAL);
    }
    // Stop periodic checks
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    // Logout
    async logout() {
        try {
            // Call server logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include' // Ensure cookies are sent
            });
        }
        catch (error) {
            console.error('[AuthStore] Logout error:', error);
        }
        finally {
            this.clearSession();
        }
    }
    // Update user info
    updateUser(updates) {
        if (!this.#session)
            return;
        this.#session = {
            ...this.#session,
            user: {
                ...this.#session.user,
                ...updates
            }
        };
        // Update localStorage
        if (browser) {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.#session));
            }
            catch (error) {
                console.error('[AuthStore] Failed to update session:', error);
            }
        }
    }
}
// Export singleton instance
export const authStore = new AuthStore();
// Export reactive getters for use in components
export function useAuth() {
    return {
        get session() { return authStore.session; },
        get user() { return authStore.user; },
        get isAuthenticated() { return authStore.isAuthenticated; },
        get isLoading() { return authStore.isLoading; },
        get isAdmin() { return authStore.isAdmin; },
        get isSuperAdmin() { return authStore.isSuperAdmin; },
        logout: () => authStore.logout(),
        checkSession: () => authStore.checkSession(),
        setSession: (session) => authStore.setSession(session),
        updateUser: (updates) => authStore.updateUser(updates)
    };
}
