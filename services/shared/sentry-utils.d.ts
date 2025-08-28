import * as Sentry from '@sentry/node';
export interface SentryConfig {
    dsn: string;
    environment: string;
    release?: string;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
    debug?: boolean;
    enabled?: boolean;
    enableLogs?: boolean;
    sendDefaultPii?: boolean;
}
export interface ServiceContext {
    serviceName: string;
    version?: string;
    environment: string;
}
/**
 * Initialize Sentry for a service
 * @param config Sentry configuration options
 * @param context Service context information
 */
export declare function initializeSentry(config: SentryConfig, context: ServiceContext): void;
/**
 * Capture an exception with additional context
 * @param error The error to capture
 * @param context Additional context to attach to the event
 */
export declare function captureException(error: Error, context?: Record<string, any>): string;
/**
 * Capture a message with level and additional context
 * @param message The message to capture
 * @param level The level of the message (default: 'info')
 * @param context Additional context to attach to the event
 */
export declare function captureMessage(message: string, level?: Sentry.SeverityLevel, context?: Record<string, any>): string;
/**
 * Create a transaction for performance monitoring
 * @param name Transaction name
 * @param op Operation name
 */
export declare function startTransaction(name: string, op: string): Sentry.Transaction;
/**
 * Create a span for performance monitoring
 * @param transaction Parent transaction
 * @param op Operation name
 * @param description Description of the span
 */
export declare function startSpan(transaction: Sentry.Transaction, op: string, description: string): Sentry.Span;
/**
 * Close Sentry client and flush events
 * @param timeout Timeout in milliseconds
 */
export declare function closeSentry(timeout?: number): Promise<boolean>;
/**
 * Get the current Sentry hub
 */
export declare function getCurrentHub(): Sentry.Hub;
/**
 * Create a span for AI model interactions
 * @param modelName The AI model being used (e.g., 'gpt-4o', 'claude-3')
 * @param operation The operation being performed (e.g., 'Generate Text', 'Create Content')
 * @param callback The AI function to execute within the span
 * @returns The result of the callback function
 */
export declare function withAISpan<T>(modelName: string, operation: string, callback: (span: Sentry.Span) => Promise<T>): Promise<T>;
declare const _default: {
    initializeSentry: typeof initializeSentry;
    captureException: typeof captureException;
    captureMessage: typeof captureMessage;
    startTransaction: typeof startTransaction;
    startSpan: typeof startSpan;
    closeSentry: typeof closeSentry;
    getCurrentHub: typeof getCurrentHub;
    withAISpan: typeof withAISpan;
    withAgentSpan: typeof withAgentSpan;
};
export default _default;
/**
 * Create a span for AI agent interactions specifically
 * @param agentName The name of the agent (e.g., 'research-agent', 'creative-agent')
 * @param modelName The AI model being used
 * @param task The task being performed
 * @param callback The AI function to execute within the span
 * @returns The result of the callback function
 */
export declare function withAgentSpan<T>(agentName: string, modelName: string, task: string, callback: (span: Sentry.Span) => Promise<T>): Promise<T>;
//# sourceMappingURL=sentry-utils.d.ts.map