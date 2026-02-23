





export interface EvaluationResult {
	id: string;
	type: string;
	severity: 'error' | 'warning' | 'info';
	message: string;
	selector: string;
	wcagLevel: 'A' | 'AA' | 'AAA';
	wcagCriteria: string;
	timestamp: number;
	metadata: Record<string, unknown>;
}

export interface EvaluationStats {
	totalElements: number;
	evaluatedElements: number;
	issues: number;
	criticalIssues: number;
	evaluationTimeMs: number;
	memoryUsageMB: number;
}

export interface EvaluationConfig {
	enabled: boolean;
	streamingEnabled: boolean;
	evaluationInterval: number;
	samplingStrategy: {
		type: 'adaptive' | 'fixed';
		maxElements: number;
		throttleMs: number;
	};
	maxMemoryMB: number;
	batchSize: number;
	batchInterval: number;
	viewportOnly: boolean;
}





export interface AccessibilityOrchestratorInterface {
	start(): Promise<void>;
	stop(): void;
	evaluate(): Promise<void>;
	client?: {
		on?(event: string, handler: (...args: unknown[]) => void): void;
		emit?(event: string, data: unknown): void;
		getStatus?(): { connected: boolean };
	};
}




export type AccessibilityOrchestratorFactory = (
	config: EvaluationConfig,
	onResults: (results: EvaluationResult[], stats: EvaluationStats) => void
) => AccessibilityOrchestratorInterface;
