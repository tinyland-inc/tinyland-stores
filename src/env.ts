/**
 * Environment detection utilities.
 *
 * Replaces SvelteKit's `$app/environment` for standalone usage.
 * Stores use this instead of importing from `$app/environment`.
 */

/** True when running in a browser context (not SSR). */
export const browser: boolean = typeof window !== 'undefined';
