import { describe, it, expect } from 'vitest';
import type { EvaluationResult, EvaluationStats } from '../src/types/accessibility.js';

describe('GlobalAccessibilityStore Buffer Management', () => {
	it('should limit results buffer to 100 items', () => {
		const mockResults: EvaluationResult[] = [];
		const MAX_BUFFER_SIZE = 100;

		const handleResults = (newResults: EvaluationResult[], existingResults: EvaluationResult[]) => {
			const combinedResults = [...newResults, ...existingResults];
			return combinedResults.slice(0, MAX_BUFFER_SIZE);
		};

		const newResults: EvaluationResult[] = Array(150).fill(null).map((_, i) => ({
			id: `result-${i}`,
			type: 'contrast' as const,
			severity: 'warning' as const,
			message: `Test result ${i}`,
			selector: `#element-${i}`,
			wcagLevel: 'AA' as const,
			wcagCriteria: '1.4.3',
			timestamp: Date.now(),
			metadata: {}
		}));

		const bufferedResults = handleResults(newResults, mockResults);

		expect(bufferedResults.length).toBe(100);
		expect(bufferedResults[0].id).toBe('result-0');
		expect(bufferedResults[99].id).toBe('result-99');
	});

	it('should maintain FIFO queue behavior', () => {
		const MAX_BUFFER_SIZE = 100;
		let results: EvaluationResult[] = [];

		const handleResults = (newResults: EvaluationResult[], existingResults: EvaluationResult[]) => {
			const combinedResults = [...newResults, ...existingResults];
			return combinedResults.slice(0, MAX_BUFFER_SIZE);
		};

		const batch1: EvaluationResult[] = Array(50).fill(null).map((_, i) => ({
			id: `batch1-${i}`,
			type: 'contrast' as const,
			severity: 'warning' as const,
			message: `Batch 1 result ${i}`,
			selector: `#element-${i}`,
			wcagLevel: 'AA' as const,
			wcagCriteria: '1.4.3',
			timestamp: Date.now(),
			metadata: {}
		}));

		results = handleResults(batch1, results);
		expect(results.length).toBe(50);

		const batch2: EvaluationResult[] = Array(60).fill(null).map((_, i) => ({
			id: `batch2-${i}`,
			type: 'contrast' as const,
			severity: 'error' as const,
			message: `Batch 2 result ${i}`,
			selector: `#element-${i}`,
			wcagLevel: 'A' as const,
			wcagCriteria: '1.4.3',
			timestamp: Date.now() + 1000,
			metadata: {}
		}));

		results = handleResults(batch2, results);

		expect(results.length).toBe(100);
		expect(results[0].id).toBe('batch2-0');
		expect(results[59].id).toBe('batch2-59');
		expect(results[60].id).toBe('batch1-0');
		expect(results[99].id).toBe('batch1-39');

		const droppedIds = results.filter(r => r.id.startsWith('batch1-4'));
		expect(droppedIds.length).toBe(0);
	});

	it('should estimate buffer memory usage correctly', () => {
		const avgResultSizeBytes = 500;
		const resultCount = 100;
		const expectedMB = (resultCount * avgResultSizeBytes) / (1024 * 1024);

		const estimateBufferMemoryUsage = (count: number) => {
			const totalBytes = count * avgResultSizeBytes;
			return totalBytes / (1024 * 1024);
		};

		expect(estimateBufferMemoryUsage(100)).toBeCloseTo(expectedMB, 2);
		expect(estimateBufferMemoryUsage(50)).toBeCloseTo(expectedMB / 2, 2);
		expect(estimateBufferMemoryUsage(0)).toBe(0);
	});
});
