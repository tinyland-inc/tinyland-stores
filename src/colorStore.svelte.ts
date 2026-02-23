










import type { ColorResult, ColorValue, ColorError } from './types/color.js';


export type { ColorResult, ColorValue, ColorError };


type RGBColor = { r: number; g: number; b: number };





export interface ColorUtilities {
	parseOklchString: (input: string) => { l: number; c: number; h: number; alpha: number } | null;
	parseOklabString: (input: string) => { l: number; a: number; b: number; alpha: number } | null;
	oklchToRgb: (l: number, c: number, h: number) => RGBColor;
	oklabToRgb: (l: number, a: number, b: number) => RGBColor;
}

let _colorUtils: ColorUtilities | null = null;





export function configureColorStore(utils: ColorUtilities): void {
	_colorUtils = utils;
}










export function createColorValue(cssString: string): ColorResult<ColorValue> {
	const input = cssString.trim();
	const lowerInput = input.toLowerCase();

	
	if (lowerInput.startsWith('oklch(')) {
		if (!_colorUtils) {
			return {
				ok: false,
				error: {
					code: 'PARSE_FAILED',
					message: 'OKLCH parsing requires configureColorStore() to be called first',
					input
				}
			};
		}

		const parsed = _colorUtils.parseOklchString(input);
		if (!parsed) {
			return {
				ok: false,
				error: {
					code: 'PARSE_FAILED',
					message: `Invalid OKLCH format: ${input}`,
					input
				}
			};
		}

		const rgb = _colorUtils.oklchToRgb(parsed.l, parsed.c, parsed.h);
		const inGamut = isInSrgbGamut(rgb);

		return {
			ok: true,
			value: {
				original: cssString,
				space: 'oklch',
				rgb: [rgb.r, rgb.g, rgb.b] as const,
				alpha: parsed.alpha,
				inGamut,
				parsed: { l: parsed.l, c: parsed.c, h: parsed.h }
			}
		};
	}

	
	if (lowerInput.startsWith('oklab(')) {
		if (!_colorUtils) {
			return {
				ok: false,
				error: {
					code: 'PARSE_FAILED',
					message: 'OKLAB parsing requires configureColorStore() to be called first',
					input
				}
			};
		}

		const parsed = _colorUtils.parseOklabString(input);
		if (!parsed) {
			return {
				ok: false,
				error: {
					code: 'PARSE_FAILED',
					message: `Invalid OKLAB format: ${input}`,
					input
				}
			};
		}

		const rgb = _colorUtils.oklabToRgb(parsed.l, parsed.a, parsed.b);
		const inGamut = isInSrgbGamut(rgb);

		return {
			ok: true,
			value: {
				original: cssString,
				space: 'oklab',
				rgb: [rgb.r, rgb.g, rgb.b] as const,
				alpha: parsed.alpha,
				inGamut,
				parsed: { l: parsed.l, a: parsed.a, b: parsed.b }
			}
		};
	}

	
	const rgbMatch = lowerInput.match(/rgba?\((\d+),?\s*(\d+),?\s*(\d+)(?:,?\s*([0-9.]+))?\)/);
	if (rgbMatch) {
		return {
			ok: true,
			value: {
				original: cssString,
				space: 'srgb',
				rgb: [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])] as const,
				alpha: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
				inGamut: true
			}
		};
	}

	
	const hexMatch = lowerInput.match(/^#?([0-9a-f]{6})([0-9a-f]{2})?$/);
	if (hexMatch) {
		return {
			ok: true,
			value: {
				original: cssString,
				space: 'srgb',
				rgb: [
					parseInt(hexMatch[1].slice(0, 2), 16),
					parseInt(hexMatch[1].slice(2, 4), 16),
					parseInt(hexMatch[1].slice(4, 6), 16)
				] as const,
				alpha: hexMatch[2] ? parseInt(hexMatch[2], 16) / 255 : 1,
				inGamut: true
			}
		};
	}

	return {
		ok: false,
		error: {
			code: 'INVALID_FORMAT',
			message: `Unsupported color format: ${input}`,
			input
		}
	};
}




function isInSrgbGamut(rgb: RGBColor): boolean {
	return rgb.r >= 0 && rgb.r <= 255 && rgb.g >= 0 && rgb.g <= 255 && rgb.b >= 0 && rgb.b <= 255;
}




export function createReactiveColor(initialValue: string) {
	let cssString = $state(initialValue);
	let result = $derived(createColorValue(cssString));

	return {
		get cssString() {
			return cssString;
		},
		get result() {
			return result;
		},
		update(newValue: string) {
			cssString = newValue;
		}
	};
}




export function createContrastCalculator(foregroundCss: string, backgroundCss: string) {
	const fg = createReactiveColor(foregroundCss);
	const bg = createReactiveColor(backgroundCss);

	const ratio = $derived.by(() => {
		if (!fg.result.ok || !bg.result.ok) return 0;
		return calculateContrastRatio(fg.result.value.rgb, bg.result.value.rgb);
	});

	const meetsAA = $derived(ratio >= 4.5);
	const meetsAAA = $derived(ratio >= 7);

	return {
		get foreground() {
			return fg;
		},
		get background() {
			return bg;
		},
		get ratio() {
			return ratio;
		},
		get meetsAA() {
			return meetsAA;
		},
		get meetsAAA() {
			return meetsAAA;
		},
		updateForeground(newCss: string) {
			fg.update(newCss);
		},
		updateBackground(newCss: string) {
			bg.update(newCss);
		}
	};
}




function calculateContrastRatio(
	rgb1: readonly [number, number, number],
	rgb2: readonly [number, number, number]
): number {
	const l1 = getRelativeLuminance(rgb1);
	const l2 = getRelativeLuminance(rgb2);

	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	return (lighter + 0.05) / (darker + 0.05);
}




function getRelativeLuminance(rgb: readonly [number, number, number]): number {
	const [r, g, b] = rgb.map((val) => {
		const srgb = val / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
	});

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
