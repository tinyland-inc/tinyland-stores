







export interface TraceQLQueryInput {
	query: string;
	startTime: Date;
	endTime: Date;
	limit: number;
}


export interface TRPCTraceQLResponse {
	spans: unknown[];
	aggregations: {
		attributeName?: string;
		values?: { value?: string; count?: number }[];
	}[];
	metadata: {
		executionTimeMs: number;
		resultCount: number;
		truncated: boolean;
		query: string;
		timeRange: {
			startTime: Date;
			endTime: Date;
		};
	};
}


export interface TraceQLClient {
	traceql: {
		query: {
			query(input: TraceQLQueryInput): Promise<TRPCTraceQLResponse>;
		};
	};
}


export interface ObservabilityClient {
	ingestA11y(url: string, violations: unknown[], fingerprint?: unknown): Promise<void>;
	ingestMetrics(url: string, metrics: unknown): Promise<void>;
	ingestThemeState(
		url: string,
		theme: string,
		previousTheme?: string,
		hydrationComplete?: boolean,
		hydrationDuration?: number
	): Promise<void>;
}


export type GetFingerprintFn = () => Promise<string>;


export interface ContrastViolation {
	element: string;
	foreground: string;
	background: string;
	ratio: number;
	requiredRatio: number;
	wcagLevel: 'aa' | 'aaa';
	theme?: string;
	isDark?: boolean;
}

export interface ContrastChecker {
	scanPage(options: { targetLevel: 'aa' | 'aaa' }): ContrastViolation[];
	getSummary(): { worstRatio: number; averageRatio: number };
	formatForLogging(): unknown;
}

export type GetContrastCheckerFn = () => ContrastChecker;
