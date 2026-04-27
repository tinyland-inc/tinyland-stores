export interface RefreshConfig {
    id: string;
    query: string;
    startTime: Date;
    endTime: Date;
    intervalMs: number;
    enabled: boolean;
    priority: 'high' | 'medium' | 'low';
    onRefresh: () => Promise<void>;
    onError?: (error: Error) => void;
}
export declare function getIntervalByPriority(priority: 'high' | 'medium' | 'low'): number;
export declare function registerRefresh(config: RefreshConfig): void;
export declare function stopRefresh(id: string): void;
export declare function pauseRefresh(id: string): void;
export declare function resumeRefresh(id: string): void;
export declare function pauseAll(): void;
export declare function resumeAll(): void;
export declare function stopAll(): void;
export declare function triggerRefresh(id: string): Promise<void>;
export declare function getRefreshStatus(): {
    active: string[];
    paused: string[];
    errorCounts: Record<string, number>;
};
//# sourceMappingURL=auto-refresh.svelte.d.ts.map