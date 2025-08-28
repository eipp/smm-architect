export interface LogContext {
    requestId?: string;
    correlationId?: string;
    tenantId?: string;
    userId?: string;
    workspaceId?: string;
    agentType?: string;
    modelId?: string;
    operationId?: string;
    traceId?: string;
    spanId?: string;
}
export interface LogEntry {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    context: LogContext;
    data?: any;
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
    duration?: number;
    service: string;
    environment: string;
    version: string;
}
export declare class StructuredLogger {
    private static contextStorage;
    private service;
    private environment;
    private version;
    private enableConsole;
    private enableSentry;
    private logLevel;
    constructor(service: string, options?: {
        environment?: string;
        version?: string;
        enableConsole?: boolean;
        enableSentry?: boolean;
        logLevel?: string;
    });
    static setContext(context: LogContext): void;
    static getContext(): LogContext;
    static withContext<T>(context: LogContext, fn: () => T): T;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any, error?: Error): void;
    error(message: string, error?: Error, data?: any): void;
    fatal(message: string, error?: Error, data?: any): void;
    time(operationId: string): () => void;
    audit(action: string, resource: string, data?: any): void;
    security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any): void;
    private log;
    private shouldLog;
    private output;
    private sendToSentry;
    private maskPII;
    private sanitizeContext;
    private sanitizeData;
    private isSensitiveField;
    private hashSensitive;
}
export declare function requestLoggingMiddleware(logger: StructuredLogger): (req: any, res: any, next: any) => void;
export declare function createLogger(service: string, options?: {
    environment?: string;
    version?: string;
    enableConsole?: boolean;
    enableSentry?: boolean;
    logLevel?: string;
}): StructuredLogger;
export declare const logger: StructuredLogger;
//# sourceMappingURL=structured-logger.d.ts.map