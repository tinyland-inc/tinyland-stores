/**
 * AutoSave Store (Svelte 5 Runes)
 *
 * Manages draft persistence and synchronization for admin content editing.
 * Integrates with useEditorQueue for debounced, serial execution.
 *
 * IMPORTANT: This store now uses the editor queue for all save operations
 * to prevent race conditions during rapid editing.
 */
interface Draft {
    id: string;
    type: 'post' | 'event' | 'profile';
    content: any;
    lastSaved: number;
    userId?: string;
}
interface AutoSaveState {
    drafts: Map<string, Draft>;
    currentDraftId: string | null;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    lastError: string | null;
    syncEnabled: boolean;
}
declare class AutoSaveStore {
    private _state;
    private _queue;
    get drafts(): Draft[];
    get currentDraft(): Draft | null;
    get saveStatus(): AutoSaveState['saveStatus'];
    get lastError(): string | null;
    get isSaving(): boolean;
    get isSaved(): boolean;
    /**
     * Save draft to server (queued and debounced)
     *
     * This method now uses the editor queue to prevent race conditions
     * during rapid editing. Saves are automatically debounced by 1.5s.
     */
    saveDraft(draftId: string, content: any, type: Draft['type']): string;
    /**
     * Load draft from server
     */
    loadDraft(draftId: string): Promise<Draft | null>;
    /**
     * Delete draft from server
     */
    deleteDraft(draftId: string): Promise<boolean>;
    /**
     * List all drafts for current user
     */
    listDrafts(): Promise<Draft[]>;
    /** Set current draft ID */
    setCurrentDraft(draftId: string | null): void;
    /** Enable/disable sync */
    setSyncEnabled(enabled: boolean): void;
    /** Clear error */
    clearError(): void;
    /** Reset save status */
    resetStatus(): void;
    /** Get save status message for UI */
    getStatusMessage(): string;
    /**
     * Force save current draft immediately
     * Used when component is unmounting to ensure no data loss
     *
     * This flushes the editor queue to execute all pending operations immediately.
     */
    forceSave(): Promise<void>;
    /** Get queue status for debugging */
    get queueStatus(): {
        pending: number;
        isProcessing: boolean;
        hasErrors: boolean;
        isIdle: boolean;
    };
}
export declare const autoSaveStore: AutoSaveStore;
/**
 * Get save status with styling for UI display
 */
export declare function getSaveStatus(): {
    text: string;
    class: string;
};
export {};
//# sourceMappingURL=autosave.svelte.d.ts.map