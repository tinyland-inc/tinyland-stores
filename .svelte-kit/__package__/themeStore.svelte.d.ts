interface ThemeConfig {
    name: string;
    label?: string;
    displayName?: string;
    description?: string;
    hasVectors?: boolean;
    isHighContrast?: boolean;
    colors?: string[];
    source?: string;
}
type DarkModePreference = 'light' | 'dark' | 'system';
export interface ServerThemeSettings {
    theme: string;
    darkMode: DarkModePreference;
}
declare class ThemeStore {
    #private;
    get currentTheme(): string;
    get darkMode(): boolean;
    get darkModePreference(): DarkModePreference;
    get themes(): ThemeConfig[];
    get isLoading(): boolean;
    get initialized(): boolean;
    get serverSettingsApplied(): boolean;
    currentThemeConfig: ThemeConfig;
    isHighContrast: boolean;
    hasVectors: boolean;
    constructor();
    init(): Promise<void>;
    initFromServerSettings(settings: ServerThemeSettings): Promise<void>;
    resetServerSettings(): void;
    setDarkModePreference(preference: DarkModePreference): void;
    private applyTheme;
    setTheme(themeName: string): Promise<void>;
    toggleDarkMode(): void;
    getThemeByName(name: string): ThemeConfig | undefined;
    logThemeState(): void;
    subscribe: (run: (value: any) => void) => () => void;
    set: (value: any) => void;
    update: (fn: (value: any) => any) => void;
    get: () => {
        currentTheme: string;
        darkMode: boolean;
        darkModePreference: DarkModePreference;
        themes: ThemeConfig[];
        isLoading: boolean;
        initialized: boolean;
        currentThemeConfig: ThemeConfig;
        isHighContrast: boolean;
        hasVectors: boolean;
    };
    subscribeCurrentTheme(callback: (value: string) => void): () => void;
    subscribeDarkMode(callback: (value: boolean) => void): () => void;
    subscribeDarkModePreference(callback: (value: DarkModePreference) => void): () => void;
    subscribeThemes(callback: (value: ThemeConfig[]) => void): () => void;
    subscribeLoading(callback: (value: boolean) => void): () => void;
}
export declare const themeStore: ThemeStore;
export {};
//# sourceMappingURL=themeStore.svelte.d.ts.map