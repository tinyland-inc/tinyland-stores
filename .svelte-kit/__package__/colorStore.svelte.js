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
let _colorUtils = null;
/**
 * Configure color utilities for OKLCH/OKLAB support.
 * Call this once during app initialization.
 */
export function configureColorStore(utils) {
    _colorUtils = utils;
}
/**
 * Parse CSS color string and return ColorResult
 *
 * Supports:
 * - OKLCH: oklch(0.7 0.15 200) (requires configureColorStore)
 * - OKLAB: oklab(0.7 0.1 -0.05) (requires configureColorStore)
 * - RGB: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
 * - Hex: #ff0000, #ff0000ff
 */
export function createColorValue(cssString) {
    const input = cssString.trim();
    const lowerInput = input.toLowerCase();
    // OKLCH parsing (most common from getComputedStyle)
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
                rgb: [rgb.r, rgb.g, rgb.b],
                alpha: parsed.alpha,
                inGamut,
                parsed: { l: parsed.l, c: parsed.c, h: parsed.h }
            }
        };
    }
    // OKLAB parsing
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
                rgb: [rgb.r, rgb.g, rgb.b],
                alpha: parsed.alpha,
                inGamut,
                parsed: { l: parsed.l, a: parsed.a, b: parsed.b }
            }
        };
    }
    // RGB parsing (fast path)
    const rgbMatch = lowerInput.match(/rgba?\((\d+),?\s*(\d+),?\s*(\d+)(?:,?\s*([0-9.]+))?\)/);
    if (rgbMatch) {
        return {
            ok: true,
            value: {
                original: cssString,
                space: 'srgb',
                rgb: [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])],
                alpha: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
                inGamut: true
            }
        };
    }
    // Hex parsing
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
                ],
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
/**
 * Check if RGB color is within sRGB gamut
 */
function isInSrgbGamut(rgb) {
    return rgb.r >= 0 && rgb.r <= 255 && rgb.g >= 0 && rgb.g <= 255 && rgb.b >= 0 && rgb.b <= 255;
}
/**
 * Create reactive color store with Svelte 5 Runes
 */
export function createReactiveColor(initialValue) {
    let cssString = $state(initialValue);
    let result = $derived(createColorValue(cssString));
    return {
        get cssString() {
            return cssString;
        },
        get result() {
            return result;
        },
        update(newValue) {
            cssString = newValue;
        }
    };
}
/**
 * Create reactive contrast calculator
 */
export function createContrastCalculator(foregroundCss, backgroundCss) {
    const fg = createReactiveColor(foregroundCss);
    const bg = createReactiveColor(backgroundCss);
    const ratio = $derived.by(() => {
        if (!fg.result.ok || !bg.result.ok)
            return 0;
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
        updateForeground(newCss) {
            fg.update(newCss);
        },
        updateBackground(newCss) {
            bg.update(newCss);
        }
    };
}
/**
 * Calculate WCAG contrast ratio between two RGB colors
 */
function calculateContrastRatio(rgb1, rgb2) {
    const l1 = getRelativeLuminance(rgb1);
    const l2 = getRelativeLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}
/**
 * Calculate relative luminance (WCAG formula)
 */
function getRelativeLuminance(rgb) {
    const [r, g, b] = rgb.map((val) => {
        const srgb = val / 255;
        return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
