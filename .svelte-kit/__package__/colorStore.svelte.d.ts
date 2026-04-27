import type { ColorResult, ColorValue, ColorError } from './types/color.js';
export type { ColorResult, ColorValue, ColorError };
type RGBColor = {
    r: number;
    g: number;
    b: number;
};
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
export declare function configureColorStore(utils: ColorUtilities): void;
export declare function createColorValue(cssString: string): ColorResult<ColorValue>;
export declare function createReactiveColor(initialValue: string): {
    readonly cssString: string;
    readonly result: ColorResult<ColorValue>;
    update(newValue: string): void;
};
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