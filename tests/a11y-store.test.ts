import { beforeEach, describe, expect, it, vi } from 'vitest';

const runAxeEvaluation = vi.fn();
const detectBrowserA11yFingerprint = vi.fn();

vi.mock('@tummycrypt/tinyland-a11y-engine/browser', () => ({
	runAxeEvaluation,
	detectBrowserA11yFingerprint,
}));

describe('a11y store package integration', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		(globalThis as any).$state = <T>(value: T) => value;
		(globalThis as any).$derived = <T>(value: T) => value;
		document.body.innerHTML = '<main><button>Click</button></main>';
	});

	it('routes live evaluation through tinyland-a11y-engine', async () => {
		runAxeEvaluation.mockResolvedValue([
			{
				id: 'color-contrast',
				impact: 'serious',
				description: 'Insufficient contrast',
				help: 'Adjust contrast',
				helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
				nodes: [],
				tags: ['wcag2aa'],
			},
		]);

		const { a11yStore, configureA11yStore } = await import('../src/observability/a11y.svelte.ts');
		configureA11yStore({
			observabilityClient: {
				ingestA11y: vi.fn().mockResolvedValue(undefined),
			},
			getFingerprint: vi.fn().mockResolvedValue('fp_test'),
			getContrastChecker: vi.fn() as any,
		});

		await a11yStore.evaluate(document.body);

		expect(runAxeEvaluation).toHaveBeenCalledWith(document.body);
		expect(a11yStore.violations).toHaveLength(1);
		expect(a11yStore.violations[0].id).toBe('color-contrast');
	});

	it('routes accessibility fingerprint detection through tinyland-a11y-engine', async () => {
		detectBrowserA11yFingerprint.mockReturnValue({
			screenReader: { detected: true, type: 'VoiceOver', confidence: 'medium', method: 'ua' },
			preferences: {
				reducedMotion: false,
				highContrast: false,
				forcedColors: false,
				darkMode: true,
				fontScaling: 1,
			},
			assistiveTech: { touchEnabled: false, keyboardNavigation: true, focusVisible: false },
			capabilities: { ariaSupport: true, semanticHTML: true, cssVars: true },
		});

		const getFingerprint = vi.fn().mockResolvedValue('fp_test');
		const { a11yStore, configureA11yStore } = await import('../src/observability/a11y.svelte.ts');
		configureA11yStore({
			observabilityClient: {
				ingestA11y: vi.fn().mockResolvedValue(undefined),
			},
			getFingerprint,
			getContrastChecker: vi.fn() as any,
		});

		await a11yStore.initializeFingerprint();

		expect(getFingerprint).toHaveBeenCalled();
		expect(detectBrowserA11yFingerprint).toHaveBeenCalled();
		expect(a11yStore.fingerprint).toBe('fp_test');
		expect(a11yStore.a11yFingerprint?.screenReader?.detected).toBe(true);
	});

	it('initializes only once when bootstrap is requested repeatedly', async () => {
		detectBrowserA11yFingerprint.mockReturnValue({
			screenReader: { detected: false, type: null, confidence: 'low', method: 'ua' },
			preferences: {
				reducedMotion: false,
				highContrast: false,
				forcedColors: false,
				darkMode: false,
				fontScaling: 1,
			},
			assistiveTech: { touchEnabled: false, keyboardNavigation: false, focusVisible: false },
			capabilities: { ariaSupport: true, semanticHTML: true, cssVars: true },
		});

		const ingestA11y = vi.fn().mockResolvedValue(undefined);
		const getFingerprint = vi.fn().mockResolvedValue('fp_test');
		const { a11yStore, configureA11yStore } = await import('../src/observability/a11y.svelte.ts');
		configureA11yStore({
			observabilityClient: {
				ingestA11y,
			},
			getFingerprint,
			getContrastChecker: vi.fn() as any,
		});

		await Promise.all([a11yStore.initialize(), a11yStore.initialize()]);
		await a11yStore.initialize();

		expect(getFingerprint).toHaveBeenCalledTimes(1);
		expect(detectBrowserA11yFingerprint).toHaveBeenCalledTimes(1);
		expect(ingestA11y).toHaveBeenCalledTimes(1);
	});

	it('does not treat pre-configuration bootstrap as a completed initialization', async () => {
		detectBrowserA11yFingerprint.mockReturnValue({
			screenReader: { detected: false, type: null, confidence: 'low', method: 'ua' },
			preferences: {
				reducedMotion: false,
				highContrast: false,
				forcedColors: false,
				darkMode: false,
				fontScaling: 1,
			},
			assistiveTech: { touchEnabled: false, keyboardNavigation: false, focusVisible: false },
			capabilities: { ariaSupport: true, semanticHTML: true, cssVars: true },
		});

		const ingestA11y = vi.fn().mockResolvedValue(undefined);
		const getFingerprint = vi.fn().mockResolvedValue('fp_test');
		const { a11yStore, configureA11yStore } = await import('../src/observability/a11y.svelte.ts');

		await a11yStore.initialize();

		configureA11yStore({
			observabilityClient: {
				ingestA11y,
			},
			getFingerprint,
			getContrastChecker: vi.fn() as any,
		});

		await a11yStore.initialize();

		expect(getFingerprint).toHaveBeenCalledTimes(1);
		expect(detectBrowserA11yFingerprint).toHaveBeenCalledTimes(1);
		expect(ingestA11y).toHaveBeenCalledTimes(1);
	});
});
