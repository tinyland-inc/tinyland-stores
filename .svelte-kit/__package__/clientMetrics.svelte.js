class ClientMetricsStore {
    _metrics = $state({
        pageViews: 0,
        interactions: 0,
        errors: 0
    });
    get metrics() {
        return this._metrics;
    }
    trackPageView() {
        this._metrics.pageViews++;
    }
    trackInteraction() {
        this._metrics.interactions++;
    }
    trackError() {
        this._metrics.errors++;
    }
    reset() {
        this._metrics = {
            pageViews: 0,
            interactions: 0,
            errors: 0
        };
    }
}
export const clientMetrics = new ClientMetricsStore();
