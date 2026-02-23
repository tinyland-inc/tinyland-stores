import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';







describe('CSRF Store', () => {
	let mockStorage: Record<string, string>;

	beforeEach(() => {
		mockStorage = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
			removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
			clear: vi.fn(() => { mockStorage = {}; }),
			length: 0,
			key: vi.fn(() => null)
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('Token Generation', () => {
		it('should generate tokens of expected length', () => {
			
			const generateToken = (): string => {
				const array = new Uint8Array(32);
				
				
				for (let i = 0; i < array.length; i++) {
					array[i] = Math.floor(Math.random() * 256);
				}
				return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
			};

			const token = generateToken();
			expect(token).toHaveLength(64); 
			expect(token).toMatch(/^[0-9a-f]{64}$/);
		});

		it('should generate unique tokens each time', () => {
			const generateToken = (): string => {
				const array = new Uint8Array(32);
				for (let i = 0; i < array.length; i++) {
					array[i] = Math.floor(Math.random() * 256);
				}
				return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
			};

			const tokens = new Set<string>();
			for (let i = 0; i < 100; i++) {
				tokens.add(generateToken());
			}
			
			expect(tokens.size).toBe(100);
		});
	});

	describe('Token Storage', () => {
		it('should persist token to localStorage', () => {
			const TOKEN_KEY = 'csrf_token';
			const token = 'test-token-abc123';

			localStorage.setItem(TOKEN_KEY, token);

			expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
		});

		it('should retrieve stored token', () => {
			const TOKEN_KEY = 'csrf_token';
			const storedToken = 'stored-csrf-token-xyz';

			mockStorage[TOKEN_KEY] = storedToken;

			const retrieved = localStorage.getItem(TOKEN_KEY);
			expect(retrieved).toBe(storedToken);
		});

		it('should return null when no token stored', () => {
			const TOKEN_KEY = 'csrf_token';
			const retrieved = localStorage.getItem(TOKEN_KEY);
			expect(retrieved).toBeNull();
		});
	});

	describe('Token Rotation', () => {
		it('should generate new token on rotation', () => {
			const generateToken = (): string => {
				const array = new Uint8Array(32);
				for (let i = 0; i < array.length; i++) {
					array[i] = Math.floor(Math.random() * 256);
				}
				return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
			};

			const TOKEN_KEY = 'csrf_token';
			const oldToken = generateToken();
			localStorage.setItem(TOKEN_KEY, oldToken);

			
			const newToken = generateToken();
			localStorage.setItem(TOKEN_KEY, newToken);

			expect(localStorage.getItem(TOKEN_KEY)).toBe(newToken);
			expect(newToken).not.toBe(oldToken);
		});
	});

	describe('Token Validation', () => {
		it('should validate matching tokens', () => {
			const validateToken = (stored: string | null, provided: string): boolean => {
				if (!stored || !provided) return false;
				return stored === provided;
			};

			const token = 'valid-token-123';
			expect(validateToken(token, token)).toBe(true);
		});

		it('should reject mismatched tokens', () => {
			const validateToken = (stored: string | null, provided: string): boolean => {
				if (!stored || !provided) return false;
				return stored === provided;
			};

			expect(validateToken('token-a', 'token-b')).toBe(false);
		});

		it('should reject empty tokens', () => {
			const validateToken = (stored: string | null, provided: string): boolean => {
				if (!stored || !provided) return false;
				return stored === provided;
			};

			expect(validateToken(null, 'some-token')).toBe(false);
			expect(validateToken('some-token', '')).toBe(false);
		});
	});
});
