import { type AutoSaveTransport, type Draft } from './autosave-transport.js';
interface AutoSaveState {
    drafts: Map<string, Draft>;
    currentDraftId: string | null;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    lastError: string | null;
    syncEnabled: boolean;
}
declare class AutoSaveStore {
    private readonly _transport;
    constructor(_transport?: AutoSaveTransport);
    private _state;
    private _queue;
    get drafts(): Draft[];
    get currentDraft(): Draft | null;
    get saveStatus(): AutoSaveState['saveStatus'];
    get lastError(): string | null;
    get isSaving(): boolean;
    get isSaved(): boolean;
    saveDraft(draftId: string, content: unknown, type: Draft['type']): string;
    loadDraft(draftId: string): Promise<Draft | null>;
    deleteDraft(draftId: string): Promise<boolean>;
    listDrafts(): Promise<Draft[]>;
    setCurrentDraft(draftId: string | null): void;
    setSyncEnabled(enabled: boolean): void;
    clearError(): void;
    resetStatus(): void;
    getStatusMessage(): string;
    forceSave(): Promise<void>;
    get queueStatus(): {
        pending: number;
        isProcessing: boolean;
        hasErrors: boolean;
        isIdle: boolean;
    };
}
export declare function createAutoSaveStore(transport?: AutoSaveTransport): AutoSaveStore;
export declare const autoSaveStore: AutoSaveStore;
export declare function getSaveStatus(store?: Pick<AutoSaveStore, 'saveStatus' | 'getStatusMessage'>): {
    text: string;
    class: string;
};
export {};
//# sourceMappingURL=autosave.svelte.d.ts.map