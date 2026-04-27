export type ColorResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: ColorError;
};
export interface ColorError {
    code: 'PARSE_FAILED' | 'OUT_OF_GAMUT' | 'CONVERSION_FAILED' | 'INVALID_FORMAT';
    message: string;
    input: string;
}
export interface ColorValue {
    readonly original: string;
    readonly space: 'srgb' | 'oklch' | 'oklab' | 'p3' | 'display-p3';
    readonly rgb: readonly [number, number, number];
    readonly alpha: number;
    readonly inGamut: boolean;
    readonly parsed?: {
        l?: number;
        c?: number;
        h?: number;
        a?: number;
        b?: number;
    };
}
//# sourceMappingURL=color.d.ts.map