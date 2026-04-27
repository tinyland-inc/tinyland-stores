interface AuthUser {
    id: string;
    username: string;
    name: string;
    role: string;
}
interface AuthSession {
    user: AuthUser;
    sessionId: string;
    expires: string;
    id?: string;
}
declare class AuthStore {
    #private;
    private readonly STORAGE_KEY;
    private readonly CHECK_INTERVAL;
    private checkInterval;
    constructor();
    get session(): AuthSession | null;
    get user(): AuthUser | null;
    get isAuthenticated(): boolean;
    get isLoading(): boolean;
    get isAdmin(): boolean;
    get isSuperAdmin(): boolean;
    private init;
    setSession(session: AuthSession): void;
    clearSession(): void;
    checkSession(): Promise<boolean>;
    private startPeriodicCheck;
    private stopPeriodicCheck;
    logout(): Promise<void>;
    updateUser(updates: Partial<AuthUser>): void;
}
export declare const authStore: AuthStore;
export declare function useAuth(): {
    readonly session: AuthSession | null;
    readonly user: AuthUser | null;
    readonly isAuthenticated: boolean;
    readonly isLoading: boolean;
    readonly isAdmin: boolean;
    readonly isSuperAdmin: boolean;
    logout: () => Promise<void>;
    checkSession: () => Promise<boolean>;
    setSession: (session: AuthSession) => void;
    updateUser: (updates: Partial<AuthUser>) => void;
};
export {};
//# sourceMappingURL=auth.svelte.d.ts.map