interface ClientMetrics {
    pageViews: number;
    interactions: number;
    errors: number;
}
declare class ClientMetricsStore {
    private _metrics;
    get metrics(): ClientMetrics;
    trackPageView(): void;
    trackInteraction(): void;
    trackError(): void;
    reset(): void;
}
export declare const clientMetrics: ClientMetricsStore;
export {};
//# sourceMappingURL=clientMetrics.svelte.d.ts.map