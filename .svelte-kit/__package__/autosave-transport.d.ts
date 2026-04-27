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
export declare function createAutoSaveApiTransport(fetchImpl?: typeof fetch): AutoSaveTransport;
//# sourceMappingURL=autosave-transport.d.ts.map