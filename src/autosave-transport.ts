export interface Draft {
	id: string;
	type: 'post' | 'event' | 'profile';
	content: unknown;
	lastSaved: number;
	userId?: string;
}

export interface AutoSaveTransport {
	saveDraft(draftId: string, content: unknown, type: Draft['type']): Promise<Draft>;
	loadDraft(draftId: string): Promise<Draft | null>;
	deleteDraft(draftId: string): Promise<boolean>;
	listDrafts(): Promise<Draft[]>;
}

export function createAutoSaveApiTransport(fetchImpl: typeof fetch = fetch): AutoSaveTransport {
	return {
		async saveDraft(draftId, content, type) {
			const response = await fetchImpl('/api/drafts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ draftId, content, type })
			});

			if (!response.ok) {
				throw new Error(`Failed to save draft: ${response.statusText}`);
			}

			return response.json();
		},

		async loadDraft(draftId) {
			const response = await fetchImpl(`/api/drafts/${draftId}`);

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to load draft: ${response.statusText}`);
			}

			return response.json();
		},

		async deleteDraft(draftId) {
			const response = await fetchImpl(`/api/drafts/${draftId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Failed to delete draft: ${response.statusText}`);
			}

			return true;
		},

		async listDrafts() {
			const response = await fetchImpl('/api/drafts');

			if (!response.ok) {
				throw new Error(`Failed to list drafts: ${response.statusText}`);
			}

			return response.json();
		}
	};
}
