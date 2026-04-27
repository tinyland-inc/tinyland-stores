










import { browser } from './env.js';
import type { FingerprintSettings } from './types/fingerprint.js';


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


class ThemeStore {
  
  #currentTheme = $state<string>('trans');
  #darkMode = $state<boolean>(true); 
  #darkModePreference = $state<DarkModePreference>('system');
  #themes = $state<ThemeConfig[]>([]);
  #isLoading = $state<boolean>(false);
  #initialized = $state<boolean>(false);
  #serverSettingsApplied = $state<boolean>(false);
  #mediaQueryCleanup: (() => void) | null = null;

  
  #defaultThemes: ThemeConfig[] = [
    {
      name: 'tinyland',
      label: 'Tinyland',
      description: 'Soft violet, blue, and pink glow',
      colors: ['#8B5CF6', '#3B82F6', '#EC4899'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'trans',
      label: 'Trans Pride',
      description: 'Soft trans pride palette',
      colors: ['#5BCEFA', '#F5A9B8', '#FFFFFF'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'pride',
      label: 'Pride Rainbow',
      description: 'Rainbow signal colors with diffuse vectors',
      colors: ['#E40303', '#FF8C00', '#732982'],
      source: 'custom',
      hasVectors: true
    },
    {
      name: 'high-contrast',
      label: 'High Contrast',
      description: 'WCAG AAA compliant for maximum readability',
      colors: ['#000000', '#FFFFFF', '#0040FF'],
      source: 'custom'
    },
    {
      name: 'cerberus',
      label: 'Cerberus',
      description: 'Dark indigo base with bright violet accents',
      colors: ['#7C3AED', '#A78BFA', '#312E81'],
      source: 'skeleton',
      hasVectors: true
    },
    {
      name: 'rose',
      label: 'Rose',
      description: 'Warm rose and apricot highlights',
      colors: ['#FB7185', '#FDBA74', '#A78BFA'],
      source: 'skeleton',
      hasVectors: true
    },
    {
      name: 'catppuccin',
      label: 'Catppuccin',
      description: 'Pastel mauve, peach, and mint',
      colors: ['#CBA6F7', '#F5C2E7', '#94E2D5'],
      source: 'skeleton',
      hasVectors: true
    },
    {
      name: 'pine',
      label: 'Pine',
      description: 'Forest greens with bright moss accents',
      colors: ['#22C55E', '#86EFAC', '#166534'],
      source: 'skeleton',
      hasVectors: true
    }
  ];

  
  get currentTheme() { return this.#currentTheme; }
  get darkMode() { return this.#darkMode; }
  get darkModePreference() { return this.#darkModePreference; }
  get themes() { return this.#themes; }
  get isLoading() { return this.#isLoading; }
  get initialized() { return this.#initialized; }
  get serverSettingsApplied() { return this.#serverSettingsApplied; }

  
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
      
    }

    const defaultTheme = fallbackTheme || 'trans';
    const defaultDarkModePreference: DarkModePreference = fallbackDarkMode || 'system';

    this.#darkModePreference = defaultDarkModePreference;
    this.#darkMode = this.#calculateDarkMode();

    this.#setupSystemPreferenceListener();

    const validTheme = this.#defaultThemes.some(t => t.name === defaultTheme) ? defaultTheme : 'trans';

    this.#currentTheme = validTheme;

    this.applyTheme(validTheme, this.#darkMode);

    this.logThemeState();
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

    this.applyTheme(validTheme, this.#darkMode);
    this.#initialized = true;

    console.log('[ThemeStore.initFromServerSettings] Applied server settings:', {
      theme: validTheme,
      darkMode: this.#darkMode,
      darkModePreference: this.#darkModePreference
    });

    this.logThemeState();
  }

  resetServerSettings(): void {
    this.#serverSettingsApplied = false;
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
    if (!browser || this.#currentTheme === themeName) {
      return;
    }

    if (!this.#defaultThemes.some(t => t.name === themeName)) {
      return;
    }

    try {
      document.documentElement.classList.add('theme-transitioning');

      this.#currentTheme = themeName;
      this.applyTheme(themeName, this.#darkMode);

      try {
        localStorage.setItem(ThemeStore.#STORAGE_KEY_THEME, themeName);
      } catch {
        
      }

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);

      window.dispatchEvent(new CustomEvent('theme-change', {
        detail: { theme: themeName }
      }));

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
      
    }

    window.dispatchEvent(new CustomEvent('dark-mode-change', {
      detail: { darkMode: this.#darkMode, preference: newPreference }
    }));

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  }

  getThemeByName(name: string): ThemeConfig | undefined {
    return this.#themes.find(t => t.name === name);
  }

  logThemeState(): void {
    console.log('[ThemeStore] Current state:', {
      currentTheme: this.#currentTheme,
      darkMode: this.#darkMode,
      hasVectors: this.hasVectors,
      isHighContrast: this.#currentTheme === 'high-contrast',
      isLoading: this.#isLoading,
      initialized: this.#initialized,
      availableThemes: this.#themes.map(t => t.name)
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

  subscribeDarkModePreference(callback: (value: DarkModePreference) => void) {
    return this.#subscribeToRune(() => this.#darkModePreference, callback);
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


export const themeStore = new ThemeStore();
