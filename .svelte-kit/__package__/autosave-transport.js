export function createAutoSaveApiTransport(fetchImpl = fetch) {
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
