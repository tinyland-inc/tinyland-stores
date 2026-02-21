/**
 * Reactive color parsing with Svelte 5 Runes
 * Provides type-safe color operations with railway-oriented error handling
 *
 * NOTE: Color parsing utilities (parseOklchString, etc.) must be injected
 * via configureColorStore() before use, or the store falls back to basic
 * RGB/hex parsing only.
 *
 * @module colorStore
 */
import type { ColorResult, ColorValue, ColorError } from './types/color.js';
export type { ColorResult, ColorValue, ColorError };
type RGBColor = {
    r: number;
    g: number;
    b: number;
};
/**
 * Color utility injection interface.
 * Provide these functions via configureColorStore() to enable OKLCH/OKLAB parsing.
 */
export interface ColorUtilities {
    parseOklchString: (input: string) => {
        l: number;
        c: number;
        h: number;
        alpha: number;
    } | null;
    parseOklabString: (input: string) => {
        l: number;
        a: number;
        b: number;
        alpha: number;
    } | null;
    oklchToRgb: (l: number, c: number, h: number) => RGBColor;
    oklabToRgb: (l: number, a: number, b: number) => RGBColor;
}
/**
 * Configure color utilities for OKLCH/OKLAB support.
 * Call this once during app initialization.
 */
export declare function configureColorStore(utils: ColorUtilities): void;
/**
 * Parse CSS color string and return ColorResult
 *
 * Supports:
 * - OKLCH: oklch(0.7 0.15 200) (requires configureColorStore)
 * - OKLAB: oklab(0.7 0.1 -0.05) (requires configureColorStore)
 * - RGB: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
 * - Hex: #ff0000, #ff0000ff
 */
export declare function createColorValue(cssString: string): ColorResult<ColorValue>;
/**
 * Create reactive color store with Svelte 5 Runes
 */
export declare function createReactiveColor(initialValue: string): {
    readonly cssString: string;
    readonly result: ColorResult<ColorValue>;
    update(newValue: string): void;
};
/**
 * Create reactive contrast calculator
 */
export declare function createContrastCalculator(foregroundCss: string, backgroundCss: string): {
    readonly foreground: {
        readonly cssString: string;
        readonly result: ColorResult<ColorValue>;
        update(newValue: string): void;
    };
    readonly background: {
        readonly cssString: string;
        readonly result: ColorResult<ColorValue>;
        update(newValue: string): void;
    };
    readonly ratio: number;
    readonly meetsAA: boolean;
    readonly meetsAAA: boolean;
    updateForeground(newCss: string): void;
    updateBackground(newCss: string): void;
};
//# sourceMappingURL=colorStore.svelte.d.ts.map