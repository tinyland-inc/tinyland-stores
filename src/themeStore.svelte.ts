/**
 * Theme Store (Svelte 5 Runes)
 *
 * Manages theme configuration, dark mode, and CSS loading with:
 * - OTel-first architecture (Tempo as settings database)
 * - localStorage fallback persistence
 * - System dark mode preference tracking
 * - Dynamic theme CSS loading via API
 * - Hot reload support in development
 */

import { browser } from './env.js';
import type { FingerprintSettings } from './types/fingerprint.js';

// Theme configuration interface
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

// Dark mode preference: 'light' | 'dark' | 'system'
type DarkModePreference = 'light' | 'dark' | 'system';

/**
 * Server settings for theme initialization (OTel-first architecture)
 * Passed from +layout.svelte via $page.data.fingerprintSettings
 */
export interface ServerThemeSettings {
  theme: string;
  darkMode: DarkModePreference;
}

// Svelte 5 runes-based theme store
class ThemeStore {
  // Private state using runes
  #currentTheme = $state<string>('trans');
  #darkMode = $state<boolean>(true); // Default to dark mode
  #darkModePreference = $state<DarkModePreference>('system');
  #themes = $state<ThemeConfig[]>([]);
  #loadedThemes = $state<Set<string>>(new Set(['trans']));
  #isLoading = $state<boolean>(false);
  #initialized = $state<boolean>(false);
  #serverSettingsApplied = $state<boolean>(false);
  #mediaQueryCleanup: (() => void) | null = null;

  // Default themes - trans is the primary theme with animated vectors
  #defaultThemes: ThemeConfig[] = [
    {
      name: 'tinyland',
      label: 'Tinyland',
      description: 'Default theme with soft purple tones and animated vectors',
      colors: ['oklch(54% 0.20 280deg)', 'oklch(58% 0.19 330deg)', 'oklch(52% 0.17 185deg)'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'trans',
      label: 'Trans Pride',
      description: 'Trans pride flag colors with animated vector backgrounds',
      colors: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'pride',
      label: 'Pride Rainbow',
      description: 'Classic 6-stripe pride flag with animated vectors',
      colors: ['#E40303', '#FF8C00', '#FFD700', '#008026', '#004CFF', '#732982'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'high-contrast',
      label: 'High Contrast',
      description: 'WCAG AAA compliant for maximum readability',
      colors: ['#000000', '#FFFFFF', '#0040FF', '#00FF00', '#FFCC00'],
      source: 'custom'
    },
    {
      name: 'cerberus',
      label: 'Cerberus',
      description: 'Skeleton v4 dark theme with purple accents',
      colors: ['#7c3aed', '#a78bfa', '#1e1b4b', '#312e81', '#4f46e5'],
      source: 'skeleton'
    },
    {
      name: 'rose',
      label: 'Rose',
      description: 'Skeleton v4 warm rose and pink palette',
      colors: ['#e11d48', '#fb7185', '#fda4af', '#fff1f2', '#be123c'],
      source: 'skeleton'
    },
    {
      name: 'catppuccin',
      label: 'Catppuccin',
      description: 'Soothing pastel theme with warm tones',
      colors: ['#cba6f7', '#f5c2e7', '#94e2d5', '#fab387', '#1e1e2e'],
      source: 'skeleton'
    },
    {
      name: 'pine',
      label: 'Pine',
      description: 'Forest green theme with natural earth tones',
      colors: ['#22c55e', '#86efac', '#166534', '#14532d', '#f0fdf4'],
      source: 'skeleton'
    }
  ];

  // Getters for reactive state
  get currentTheme() { return this.#currentTheme; }
  get darkMode() { return this.#darkMode; }
  get darkModePreference() { return this.#darkModePreference; }
  get themes() { return this.#themes; }
  get isLoading() { return this.#isLoading; }
  get initialized() { return this.#initialized; }
  get serverSettingsApplied() { return this.#serverSettingsApplied; }

  // Derived values as class fields
  currentThemeConfig = $derived(
    this.#themes.find(t => t.name === this.#currentTheme) ||
    this.#defaultThemes.find(t => t.name === this.#currentTheme) ||
    this.#defaultThemes[0]
  );

  isHighContrast = $derived(this.#currentTheme === 'high-contrast');

  hasVectors = $derived(this.currentThemeConfig?.hasVectors ?? false);

  constructor() {
    this.#themes = [...this.#defaultThemes];
  }

  // localStorage keys for fallback persistence
  static readonly #STORAGE_KEY_THEME = 'tinyland:theme';
  static readonly #STORAGE_KEY_DARK_MODE = 'tinyland:darkMode';

  async init() {
    if (!browser || this.#initialized) return;

    this.#initialized = true;

    let fallbackTheme: string | null = null;
    let fallbackDarkMode: DarkModePreference | null = null;

    try {
      fallbackTheme = localStorage.getItem(ThemeStore.#STORAGE_KEY_THEME);
      fallbackDarkMode = localStorage.getItem(ThemeStore.#STORAGE_KEY_DARK_MODE) as DarkModePreference | null;
    } catch {
      // localStorage may be unavailable (private browsing, etc.)
    }

    const defaultTheme = fallbackTheme || 'trans';
    const defaultDarkModePreference: DarkModePreference = fallbackDarkMode || 'dark';

    this.#darkModePreference = defaultDarkModePreference;
    this.#darkMode = this.#calculateDarkMode();

    this.#setupSystemPreferenceListener();

    const validTheme = this.#defaultThemes.some(t => t.name === defaultTheme) ? defaultTheme : 'trans';

    this.#currentTheme = validTheme;

    const currentDataTheme = document.documentElement.getAttribute('data-theme');
    const hasDarkClass = document.documentElement.classList.contains('dark');

    if (currentDataTheme !== validTheme || hasDarkClass !== this.#darkMode) {
      await this.loadThemeCSS(validTheme);
      this.applyTheme(validTheme, this.#darkMode);
    } else {
      await this.loadThemeCSS(validTheme);
    }

    this.logThemeState();
    this.loadAvailableThemes();

    if ((window as any).__DEV__) {
      this.setupHotReload();
    }
  }

  async initFromServerSettings(settings: ServerThemeSettings) {
    if (!browser) return;
    if (this.#serverSettingsApplied) return;

    console.log('[ThemeStore.initFromServerSettings] Initializing from Tempo:', settings);

    this.#serverSettingsApplied = true;

    const validTheme = this.#defaultThemes.some(t => t.name === settings.theme)
      ? settings.theme
      : 'trans';

    this.#darkModePreference = settings.darkMode;
    this.#darkMode = this.#calculateDarkMode();

    this.#currentTheme = validTheme;

    this.#setupSystemPreferenceListener();

    await this.loadThemeCSS(validTheme);
    this.applyTheme(validTheme, this.#darkMode);
    this.#initialized = true;

    console.log('[ThemeStore.initFromServerSettings] Applied server settings:', {
      theme: validTheme,
      darkMode: this.#darkMode,
      darkModePreference: this.#darkModePreference
    });

    this.logThemeState();
    this.loadAvailableThemes();
  }

  resetServerSettings(): void {
    this.#serverSettingsApplied = false;
  }

  private async loadThemeCSS(themeName: string) {
    if (!browser) return;

    console.log('[ThemeStore.loadThemeCSS] Loading CSS for:', themeName);

    if (this.#loadedThemes.has(themeName)) {
      console.log('[ThemeStore.loadThemeCSS] Theme already loaded, activating style tag');
      const existingStyle = document.querySelector(`style[data-theme-css="${themeName}"]`);
      if (existingStyle) {
        existingStyle.removeAttribute('disabled');
        document.querySelectorAll('style[data-theme-css]').forEach(style => {
          if (style !== existingStyle) {
            style.setAttribute('disabled', 'true');
          }
        });
        console.log('[ThemeStore.loadThemeCSS] Activated existing style tag for:', themeName);
        return;
      }
      console.warn('[ThemeStore.loadThemeCSS] Theme marked as loaded but no style tag found!');
    }

    try {
      this.#isLoading = true;

      const timestamp = (window as any).__DEV__ ? `?t=${Date.now()}` : '';
      const url = `/api/theme-css/${themeName}${timestamp}`;
      console.log('[ThemeStore.loadThemeCSS] Fetching from:', url);

      const response = await fetch(url, {
        cache: (window as any).__DEV__ ? 'no-store' : 'force-cache',
      });

      if (!response.ok) {
        console.error('[ThemeStore.loadThemeCSS] Fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to load theme ${themeName}: ${response.status}`);
      }

      const css = await response.text();
      console.log('[ThemeStore.loadThemeCSS] Fetched CSS length:', css.length, 'chars');

      const style = document.createElement('style');
      style.setAttribute('data-theme-css', themeName);
      style.textContent = css;
      document.head.appendChild(style);
      console.log('[ThemeStore.loadThemeCSS] Injected style tag into <head>');

      document.querySelectorAll('style[data-theme-css]').forEach(otherStyle => {
        if (otherStyle !== style) {
          otherStyle.setAttribute('disabled', 'true');
        }
      });

      this.#loadedThemes = new Set([...this.#loadedThemes, themeName]);
      console.log('[ThemeStore.loadThemeCSS] Successfully loaded and activated:', themeName);
    } catch (err) {
      console.error(`Failed to load theme CSS for ${themeName}:`, err);
    } finally {
      this.#isLoading = false;
    }
  }

  #themesLoaded = false;

  private async loadAvailableThemes() {
    if (!browser || this.#themesLoaded) return;

    try {
      const response = await fetch('/api/themes', {
        cache: 'default'
      });

      if (!response.ok) {
        console.warn(`Themes API responded with ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.warn('Themes API returned non-JSON content:', contentType);
        throw new Error('Invalid response format');
      }

      const themes: ThemeConfig[] = await response.json();
      this.#themes = themes;
      this.#themesLoaded = true;
    } catch (err) {
      console.error('Failed to load available themes:', err);
      this.#themes = [...this.#defaultThemes];
      this.#themesLoaded = true;
    }
  }

  #calculateDarkMode(): boolean {
    if (this.#darkModePreference === 'system') {
      return this.#getSystemPrefersDark();
    }
    return this.#darkModePreference === 'dark';
  }

  #getSystemPrefersDark(): boolean {
    if (!browser) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  #setupSystemPreferenceListener(): void {
    if (!browser) return;

    if (this.#mediaQueryCleanup) {
      this.#mediaQueryCleanup();
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (this.#darkModePreference === 'system') {
        this.#darkMode = e.matches;
        this.applyTheme(this.#currentTheme, this.#darkMode);

        window.dispatchEvent(new CustomEvent('dark-mode-change', {
          detail: { darkMode: this.#darkMode, source: 'system' }
        }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    this.#mediaQueryCleanup = () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }

  setDarkModePreference(preference: DarkModePreference): void {
    if (!browser) return;

    this.#darkModePreference = preference;
    this.#darkMode = this.#calculateDarkMode();

    try {
      localStorage.setItem(ThemeStore.#STORAGE_KEY_DARK_MODE, preference);
    } catch {
      // localStorage may be unavailable
    }

    this.applyTheme(this.#currentTheme, this.#darkMode);

    window.dispatchEvent(new CustomEvent('dark-mode-change', {
      detail: { darkMode: this.#darkMode, preference }
    }));
  }

  private applyTheme(themeName: string, darkMode: boolean) {
    if (!browser) return;

    const root = document.documentElement;

    const currentTheme = root.getAttribute('data-theme');
    const hasDark = root.classList.contains('dark');

    if (currentTheme === themeName && hasDark === darkMode) {
      return;
    }

    root.className = root.className.replace(/theme-\S+/g, '').trim();

    root.setAttribute('data-theme', themeName);
    root.classList.add(`theme-${themeName}`);

    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (!root.classList.contains('no-transition')) {
      root.classList.add('theme-transitioning');
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 300);
    }
  }

  async setTheme(themeName: string) {
    console.log('[ThemeStore.setTheme] Called with:', themeName, {
      currentTheme: this.#currentTheme,
      isLoading: this.#isLoading,
      browser
    });

    if (!browser || this.#currentTheme === themeName) {
      console.log('[ThemeStore.setTheme] Skipping - same theme or not in browser');
      return;
    }

    if (this.#isLoading) {
      console.log('[ThemeStore.setTheme] Skipping - already loading');
      return;
    }

    try {
      console.log('[ThemeStore.setTheme] Starting theme switch to:', themeName);
      const loadPromise = this.loadThemeCSS(themeName);

      document.documentElement.classList.add('theme-transitioning');

      await loadPromise;
      console.log('[ThemeStore.setTheme] CSS loaded for:', themeName);

      this.#currentTheme = themeName;
      console.log('[ThemeStore.setTheme] Updated internal state to:', themeName);

      this.applyTheme(themeName, this.#darkMode);
      console.log('[ThemeStore.setTheme] Applied to DOM:', {
        theme: themeName,
        darkMode: this.#darkMode,
        dataTheme: document.documentElement.getAttribute('data-theme'),
        themeClass: document.documentElement.className.match(/theme-\S+/)?.[0]
      });

      try {
        localStorage.setItem(ThemeStore.#STORAGE_KEY_THEME, themeName);
      } catch {
        // localStorage may be unavailable
      }

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);

      window.dispatchEvent(new CustomEvent('theme-change', {
        detail: { theme: themeName }
      }));
      console.log('[ThemeStore.setTheme] Theme change complete, event dispatched');

      this.logThemeState();
    } catch (err) {
      console.error(`Failed to set theme ${themeName}:`, err);
      document.documentElement.classList.remove('theme-transitioning');
    }
  }

  toggleDarkMode() {
    if (!browser) return;

    const newDarkMode = !this.#darkMode;
    const newPreference: DarkModePreference = newDarkMode ? 'dark' : 'light';

    this.#darkModePreference = newPreference;
    this.#darkMode = newDarkMode;

    const root = document.documentElement;
    root.classList.add('theme-transitioning');

    if (this.#darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    void root.offsetHeight;

    try {
      localStorage.setItem(ThemeStore.#STORAGE_KEY_DARK_MODE, newPreference);
    } catch {
      // localStorage may be unavailable
    }

    window.dispatchEvent(new CustomEvent('dark-mode-change', {
      detail: { darkMode: this.#darkMode, preference: newPreference }
    }));

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  }

  private setupHotReload() {
    window.addEventListener('theme-refresh', async (event: any) => {
      const { theme } = event.detail || {};
      if (theme === this.#currentTheme) {
        const existingStyle = document.querySelector(`style[data-theme-css="${theme}"]`);
        if (existingStyle) {
          existingStyle.remove();
        }
        this.#loadedThemes.delete(theme);
        await this.loadThemeCSS(theme);
      }
    });
  }

  getThemeByName(name: string): ThemeConfig | undefined {
    return this.#themes.find(t => t.name === name);
  }

  logThemeState(): void {
    console.log('[ThemeStore] Current state:', {
      currentTheme: this.#currentTheme,
      darkMode: this.#darkMode,
      hasVectors: ['trans'].includes(this.#currentTheme),
      isHighContrast: this.#currentTheme === 'high-contrast',
      isLoading: this.#isLoading,
      initialized: this.#initialized,
      availableThemes: this.#themes.map(t => t.name),
      loadedThemes: Array.from(this.#loadedThemes)
    });
  }

  subscribe = (run: (value: any) => void) => {
    const notify = () => run({
      currentTheme: this.#currentTheme,
      darkMode: this.#darkMode,
      darkModePreference: this.#darkModePreference,
      themes: this.#themes,
      isLoading: this.#isLoading,
      initialized: this.#initialized,
      currentThemeConfig: this.currentThemeConfig,
      isHighContrast: this.isHighContrast,
      hasVectors: this.hasVectors
    });

    notify();

    let isActive = true;
    $effect(() => {
      if (!isActive) return;
      notify();
    });

    return () => {
      isActive = false;
    };
  };

  set = (value: any) => {
    if (value.currentTheme !== undefined) this.setTheme(value.currentTheme);
    if (value.darkMode !== undefined && value.darkMode !== this.#darkMode) this.toggleDarkMode();
  };

  update = (fn: (value: any) => any) => {
    this.set(fn(this.get()));
  };

  get = () => ({
    currentTheme: this.#currentTheme,
    darkMode: this.#darkMode,
    darkModePreference: this.#darkModePreference,
    themes: this.#themes,
    isLoading: this.#isLoading,
    initialized: this.#initialized,
    currentThemeConfig: this.currentThemeConfig,
    isHighContrast: this.isHighContrast,
    hasVectors: this.hasVectors
  });

  subscribeCurrentTheme(callback: (value: string) => void) {
    return this.#subscribeToRune(() => this.#currentTheme, callback);
  }

  subscribeDarkMode(callback: (value: boolean) => void) {
    return this.#subscribeToRune(() => this.#darkMode, callback);
  }

  subscribeThemes(callback: (value: ThemeConfig[]) => void) {
    return this.#subscribeToRune(() => this.#themes, callback);
  }

  subscribeLoading(callback: (value: boolean) => void) {
    return this.#subscribeToRune(() => this.#isLoading, callback);
  }

  #subscribeToRune<T>(getter: () => T, callback: (value: T) => void): () => void {
    if (!browser) {
      return () => {};
    }

    callback(getter());

    let isActive = true;
    $effect(() => {
      if (!isActive) return;
      const value = getter();
      callback(value);
    });

    return () => {
      isActive = false;
    };
  }
}

// Export singleton instance
export const themeStore = new ThemeStore();
