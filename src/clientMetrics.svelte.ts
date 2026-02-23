






interface ClientMetrics {
	pageViews: number;
	interactions: number;
	errors: number;
}

class ClientMetricsStore {
	private _metrics = $state<ClientMetrics>({
		pageViews: 0,
		interactions: 0,
		errors: 0
	});

	get metrics(): ClientMetrics {
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
