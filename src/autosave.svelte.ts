









import { useEditorQueue } from '@tummycrypt/tinyland-composables';

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

class AutoSaveStore {
	private _state = $state<AutoSaveState>({
		drafts: new Map(),
		currentDraftId: null,
		saveStatus: 'idle',
		lastError: null,
		syncEnabled: false
	});

	
	private _queue = useEditorQueue({ debounceMs: 1500 });

	
	get drafts(): Draft[] {
		return Array.from(this._state.drafts.values());
	}

	get currentDraft(): Draft | null {
		if (!this._state.currentDraftId) return null;
		return this._state.drafts.get(this._state.currentDraftId) || null;
	}

	get saveStatus(): AutoSaveState['saveStatus'] {
		return this._state.saveStatus;
	}

	get lastError(): string | null {
		return this._state.lastError;
	}

	get isSaving(): boolean {
		return this._state.saveStatus === 'saving';
	}

	get isSaved(): boolean {
		return this._state.saveStatus === 'saved';
	}

	





	saveDraft(draftId: string, content: any, type: Draft['type']): string {
		
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

				const response = await fetch('/api/drafts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ draftId, content, type })
				});

				if (!response.ok) {
					throw new Error(`Failed to save draft: ${response.statusText}`);
				}

				const savedDraft: Draft = await response.json();
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

	


	async loadDraft(draftId: string): Promise<Draft | null> {
		try {
			const response = await fetch(`/api/drafts/${draftId}`);

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to load draft: ${response.statusText}`);
			}

			const draft: Draft = await response.json();
			this._state.drafts.set(draftId, draft);
			this._state.currentDraftId = draftId;

			return draft;
		} catch (error) {
			console.error('[AutoSave] Load failed:', error);
			this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
			return null;
		}
	}

	


	async deleteDraft(draftId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/drafts/${draftId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Failed to delete draft: ${response.statusText}`);
			}

			this._state.drafts.delete(draftId);

			if (this._state.currentDraftId === draftId) {
				this._state.currentDraftId = null;
			}

			return true;
		} catch (error) {
			console.error('[AutoSave] Delete failed:', error);
			this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
			return false;
		}
	}

	


	async listDrafts(): Promise<Draft[]> {
		try {
			const response = await fetch('/api/drafts');

			if (!response.ok) {
				throw new Error(`Failed to list drafts: ${response.statusText}`);
			}

			const drafts: Draft[] = await response.json();

			this._state.drafts.clear();
			for (const draft of drafts) {
				this._state.drafts.set(draft.id, draft);
			}

			return drafts;
		} catch (error) {
			console.error('[AutoSave] List failed:', error);
			this._state.lastError = error instanceof Error ? error.message : 'Unknown error';
			return [];
		}
	}

	
	setCurrentDraft(draftId: string | null): void {
		this._state.currentDraftId = draftId;
	}

	
	setSyncEnabled(enabled: boolean): void {
		this._state.syncEnabled = enabled;
	}

	
	clearError(): void {
		this._state.lastError = null;
	}

	
	resetStatus(): void {
		this._state.saveStatus = 'idle';
	}

	
	getStatusMessage(): string {
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

	





	async forceSave(): Promise<void> {
		if (!this._state.currentDraftId) {
			return;
		}

		const draft = this._state.drafts.get(this._state.currentDraftId);
		if (!draft) {
			return;
		}

		try {
			await this._queue.flush();
		} catch (error) {
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

export const autoSaveStore = new AutoSaveStore();




export function getSaveStatus(): { text: string; class: string } {
	const status = autoSaveStore.saveStatus;
	const message = autoSaveStore.getStatusMessage();

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
