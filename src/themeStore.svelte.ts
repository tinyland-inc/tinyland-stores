
import { getThemeCatalog } from '@tummycrypt/tinyvectors';
import { browser } from './env.js';
import type { FingerprintSettings } from './types/fingerprint.js';


export interface ThemeConfig {
  name: string;
  label?: string;
  displayName?: string;
  description?: string;
  hasVectors?: boolean;
  isHighContrast?: boolean;
  colors?: string[];
  previewColors?: string[];
  vectorColors?: string[];
  source?: string;
}


export type DarkModePreference = 'light' | 'dark' | 'system';





export interface ServerThemeSettings {
  theme: string;
  darkMode: DarkModePreference;
}


// Hub-side display labels mirror the blog (jesssullivan.github.io) theme naming
// so the switcher reads identically across surfaces. The canonical theme `name`s
// and the tinyvectors schema are unchanged — only the human-facing label differs.
const HUB_THEME_LABELS: Record<string, string> = {
  trans: 'xoxd',
  pride: 'Goth',
};

function withHubLabels<T extends { name: string; label?: string }>(themes: readonly T[]): T[] {
  return themes.map((theme) =>
    HUB_THEME_LABELS[theme.name] ? { ...theme, label: HUB_THEME_LABELS[theme.name] } : theme
  );
}


class ThemeStore {
  
  #currentTheme = $state<string>('trans');
  #darkMode = $state<boolean>(true); 
  #darkModePreference = $state<DarkModePreference>('system');
  #themes = $state<ThemeConfig[]>([]);
  #initialized = $state<boolean>(false);
  #serverSettingsApplied = $state<boolean>(false);
  #mediaQueryCleanup: (() => void) | null = null;

  
  #defaultThemes: ThemeConfig[] = [
    ...withHubLabels(getThemeCatalog()),
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
      label: 'TSS',
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
      this.#currentTheme = themeName;
      this.applyTheme(themeName, this.#darkMode);

      try {
        localStorage.setItem(ThemeStore.#STORAGE_KEY_THEME, themeName);
      } catch {
        
      }

      this.logThemeState();
    } catch (err) {
      console.error(`Failed to set theme ${themeName}:`, err);
    }
  }

  logThemeState(): void {
    console.log('[ThemeStore] Current state:', {
      currentTheme: this.#currentTheme,
      darkMode: this.#darkMode,
      hasVectors: this.hasVectors,
      isHighContrast: this.#currentTheme === 'high-contrast',
      initialized: this.#initialized,
      availableThemes: this.#themes.map(t => t.name)
    });
  }
}


export const themeStore = new ThemeStore();
