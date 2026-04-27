import { describe, expect, it, vi } from 'vitest';
import { createAutoSaveApiTransport } from '../src/autosave-transport.js';

describe('createAutoSaveApiTransport', () => {
	it('saves, loads, lists, and deletes drafts through the injected fetch implementation', async () => {
		const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
			if (url === '/api/drafts' && init?.method === 'POST') {
				return {
					ok: true,
					json: async () => ({
						id: 'draft-1',
						type: 'post',
						content: { title: 'Hello' },
						lastSaved: 123
					})
				};
			}

			if (url === '/api/drafts/draft-1') {
				if (init?.method === 'DELETE') {
					return { ok: true, json: async () => ({}) };
				}

				return {
					ok: true,
					json: async () => ({
						id: 'draft-1',
						type: 'post',
						content: { title: 'Hello' },
						lastSaved: 123
					})
				};
			}

			return {
				ok: true,
				json: async () => [
					{
						id: 'draft-1',
						type: 'post',
						content: { title: 'Hello' },
						lastSaved: 123
					}
				]
			};
		});
		const transport = createAutoSaveApiTransport(fetchImpl as never);

		const saved = await transport.saveDraft('draft-1', { title: 'Hello' }, 'post');
		const loaded = await transport.loadDraft('draft-1');
		const listed = await transport.listDrafts();
		const deleted = await transport.deleteDraft('draft-1');

		expect(fetchImpl).toHaveBeenNthCalledWith(
			1,
			'/api/drafts',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		);
		expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/drafts/draft-1');
		expect(fetchImpl).toHaveBeenNthCalledWith(3, '/api/drafts');
		expect(fetchImpl).toHaveBeenNthCalledWith(4, '/api/drafts/draft-1', { method: 'DELETE' });
		expect(saved).toEqual({
			id: 'draft-1',
			type: 'post',
			content: { title: 'Hello' },
			lastSaved: 123
		});
		expect(loaded).toEqual(saved);
		expect(listed).toEqual([saved]);
		expect(deleted).toBe(true);
	});
});
