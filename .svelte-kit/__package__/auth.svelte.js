import { browser } from './env.js';
class AuthStore {
    #session = $state(null);
    #isLoading = $state(true);
    #lastCheck = $state(null);
    STORAGE_KEY = 'stonewall_auth_session';
    CHECK_INTERVAL = 60000;
    checkInterval = null;
    constructor() {
        if (browser) {
            this.init();
        }
    }
    get session() { return this.#session; }
    get user() { return this.#session?.user || null; }
    get isAuthenticated() { return !!this.#session; }
    get isLoading() { return this.#isLoading; }
    get isAdmin() {
        return this.#session?.user?.role === 'admin' ||
            this.#session?.user?.role === 'super_admin';
    }
    get isSuperAdmin() { return this.#session?.user?.role === 'super_admin'; }
    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (new Date(data.expires) > new Date()) {
                    this.#session = {
                        user: data.user,
                        expires: data.expires,
                        sessionId: '[httpOnly]'
                    };
                    console.log('[AuthStore] Restored user from localStorage:', data.user.name);
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
    setSession(session) {
        this.#session = session;
        if (browser) {
            try {
                const storedData = {
                    user: session.user,
                    expires: session.expires
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));
                console.log('[AuthStore] User data stored in localStorage (sessionId in httpOnly cookie)');
                this.startPeriodicCheck();
            }
            catch (error) {
                console.error('[AuthStore] Failed to store session:', error);
            }
        }
    }
    clearSession() {
        this.#session = null;
        if (browser) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.stopPeriodicCheck();
        }
    }
    async checkSession() {
        if (!this.#session)
            return false;
        if (new Date(this.#session.expires) <= new Date()) {
            console.log('[AuthStore] Session expired');
            this.clearSession();
            return false;
        }
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                credentials: 'include',
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
            return true;
        }
    }
    startPeriodicCheck() {
        if (this.checkInterval)
            return;
        this.checkInterval = setInterval(() => {
            this.checkSession();
        }, this.CHECK_INTERVAL);
    }
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        }
        catch (error) {
            console.error('[AuthStore] Logout error:', error);
        }
        finally {
            this.clearSession();
        }
    }
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
export const authStore = new AuthStore();
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
