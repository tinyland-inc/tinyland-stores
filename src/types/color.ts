/**
 * Railway-oriented error handling for color operations.
 *
 * Extracted from src/lib/types/color.ts to avoid $lib/ dependency.
 * Consumers may also import these from @tinyland-inc/tinyland-types.
 */

/** Result type for color operations. */
export type ColorResult<T> = { ok: true; value: T } | { ok: false; error: ColorError };

/** Color operation error codes. */
export interface ColorError {
	code: 'PARSE_FAILED' | 'OUT_OF_GAMUT' | 'CONVERSION_FAILED' | 'INVALID_FORMAT';
	message: string;
	input: string;
}

/** Immutable color value with space information. */
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
