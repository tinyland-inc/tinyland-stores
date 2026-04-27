import { useEditorQueue } from '@tummycrypt/tinyland-composables';
import { createAutoSaveApiTransport } from './autosave-transport.js';
class AutoSaveStore {
    _transport;
    constructor(_transport = createAutoSaveApiTransport()) {
        this._transport = _transport;
    }
    _state = $state({
        drafts: new Map(),
        currentDraftId: null,
        saveStatus: 'idle',
        lastError: null,
        syncEnabled: false
    });
    _queue = useEditorQueue({ debounceMs: 1500 });
    get drafts() {
        return Array.from(this._state.drafts.values());
    }
    get currentDraft() {
        if (!this._state.currentDraftId)
            return null;
        return this._state.drafts.get(this._state.currentDraftId) || null;
    }
    get saveStatus() {
        return this._state.saveStatus;
    }
    get lastError() {
        return this._state.lastError;
    }
    get isSaving() {
        return this._state.saveStatus === 'saving';
    }
    get isSaved() {
        return this._state.saveStatus === 'saved';
    }
    saveDraft(draftId, content, type) {
        this._state.drafts.set(draftId, {
            id: draftId,
            type,
            content,
            lastSaved: Date.now(),
            userId: this._state.drafts.get(draftId)?.userId
        });
        return this._queue.enqueue({
            type: 'autosave',
            priority: 0,
            execute: async () => {
                this._state.saveStatus = 'saving';
                this._state.lastError = null;
                const savedDraft = await this._transport.saveDraft(draftId, content, type);
                this._state.drafts.set(draftId, savedDraft);
                this._state.saveStatus = 'saved';
                setTimeout(() => {
                    if (this._state.saveStatus === 'saved') {
                        this._state.saveStatus = 'idle';
                    }
                }, 2000);
            },
            onError: (error) => {
                console.error('[AutoSave] Save failed:', error);
                this._state.saveStatus = 'error';
                this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
            },
            onSuccess: () => {
                console.log('[AutoSave] Draft saved successfully:', draftId);
            }
        });
    }
    async loadDraft(draftId) {
        try {
            const draft = await this._transport.loadDraft(draftId);
            if (!draft) {
                return null;
            }
            this._state.drafts.set(draftId, draft);
            this._state.currentDraftId = draftId;
            return draft;
        }
        catch (error) {
            console.error('[AutoSave] Load failed:', error);
            this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
            return null;
        }
    }
    async deleteDraft(draftId) {
        try {
            await this._transport.deleteDraft(draftId);
            this._state.drafts.delete(draftId);
            if (this._state.currentDraftId === draftId) {
                this._state.currentDraftId = null;
            }
            return true;
        }
        catch (error) {
            console.error('[AutoSave] Delete failed:', error);
            this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
            return false;
        }
    }
    async listDrafts() {
        try {
            const drafts = await this._transport.listDrafts();
            this._state.drafts.clear();
            for (const draft of drafts) {
                this._state.drafts.set(draft.id, draft);
            }
            return drafts;
        }
        catch (error) {
            console.error('[AutoSave] List failed:', error);
            this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
            return [];
        }
    }
    setCurrentDraft(draftId) {
        this._state.currentDraftId = draftId;
    }
    setSyncEnabled(enabled) {
        this._state.syncEnabled = enabled;
    }
    clearError() {
        this._state.lastError = null;
    }
    resetStatus() {
        this._state.saveStatus = 'idle';
    }
    getStatusMessage() {
        switch (this._state.saveStatus) {
            case 'saving':
                return 'Saving...';
            case 'saved':
                return 'All changes saved';
            case 'error':
                return this._state.lastError || 'Save failed';
            default:
                return '';
        }
    }
    async forceSave() {
        if (!this._state.currentDraftId) {
            return;
        }
        const draft = this._state.drafts.get(this._state.currentDraftId);
        if (!draft) {
            return;
        }
        try {
            await this._queue.flush();
        }
        catch (error) {
            console.error('[AutoSave] Force save failed:', error);
        }
    }
    get queueStatus() {
        return {
            pending: this._queue.pending,
            isProcessing: this._queue.isProcessing,
            hasErrors: this._queue.hasErrors,
            isIdle: this._queue.isIdle
        };
    }
}
export function createAutoSaveStore(transport) {
    return new AutoSaveStore(transport);
}
export const autoSaveStore = createAutoSaveStore();
export function getSaveStatus(store = autoSaveStore) {
    const status = store.saveStatus;
    const message = store.getStatusMessage();
    let className = 'text-surface-600 dark:text-surface-400';
    switch (status) {
        case 'saving':
            className = 'text-primary-600 dark:text-primary-400';
            break;
        case 'saved':
            className = 'text-success-600 dark:text-success-400';
            break;
        case 'error':
            className = 'text-error-600 dark:text-error-400';
            break;
    }
    return {
        text: message || 'Draft auto-save enabled',
        class: className
    };
}
