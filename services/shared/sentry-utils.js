"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSentry = initializeSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.startTransaction = startTransaction;
exports.startSpan = startSpan;
exports.closeSentry = closeSentry;
exports.getCurrentHub = getCurrentHub;
exports.withAISpan = withAISpan;
exports.withAgentSpan = withAgentSpan;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
/**
 * Initialize Sentry for a service
 * @param config Sentry configuration options
 * @param context Service context information
 */
function initializeSentry(config, context) {
    if (config.enabled === false) {
        console.log(`Sentry disabled for ${context.serviceName}`);
        return;
    }
    if (!config.dsn) {
        console.warn(`Sentry DSN not provided for ${context.serviceName}. Sentry will not be initialized.`);
        return;
    }
    Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release || context.version,
        tracesSampleRate: config.tracesSampleRate || 0.1,
        profilesSampleRate: config.profilesSampleRate || 0.1,
        debug: config.debug || false,
        enableLogs: config.enableLogs ?? true,
        sendDefaultPii: config.sendDefaultPii ?? false,
        integrations: [
            // Profiling integration for performance monitoring
            (0, profiling_node_1.nodeProfilingIntegration)(),
            // HTTP integration for tracing HTTP requests
            new Sentry.Integrations.Http({
                tracing: true,
            }),
            // OnUncaughtException integration for handling uncaught exceptions
            new Sentry.Integrations.OnUncaughtException({
                exitEvenIfOtherHandlersAreRegistered: false,
            }),
            // OnUnhandledRejection integration for handling unhandled promise rejections
            new Sentry.Integrations.OnUnhandledRejection({
                mode: 'warn',
            }),
        ],
        // Before sending to Sentry, we can filter or modify events
        beforeSend(event, hint) {
            // Filter out network errors that are not actionable
            if (event.exception?.values?.[0]?.type === 'AbortError') {
                return null;
            }
            // Add service-specific tags
            if (!event.tags) {
                event.tags = {};
            }
            event.tags.service = context.serviceName;
            event.tags.environment = context.environment;
            return event;
        },
        // Before sending breadcrumbs, we can filter or modify them
        beforeBreadcrumb(breadcrumb, hint) {
            // Filter out console logs that are not errors or warnings in production
            if (context.environment === 'production' &&
                breadcrumb.category === 'console' &&
                breadcrumb.level !== 'error' &&
                breadcrumb.level !== 'warning') {
                return null;
            }
            return breadcrumb;
        },
    });
    // Set initial scope with service context
    Sentry.configureScope((scope) => {
        scope.setTag('service', context.serviceName);
        scope.setTag('environment', context.environment);
        if (context.version) {
            scope.setTag('version', context.version);
        }
    });
    console.log(`Sentry initialized for ${context.serviceName} in ${context.environment} environment`);
}
/**
 * Capture an exception with additional context
 * @param error The error to capture
 * @param context Additional context to attach to the event
 */
function captureException(error, context) {
    return Sentry.captureException(error, {
        contexts: {
            service: context,
        },
    });
}
/**
 * Capture a message with level and additional context
 * @param message The message to capture
 * @param level The level of the message (default: 'info')
 * @param context Additional context to attach to the event
 */
function captureMessage(message, level = 'info', context) {
    return Sentry.captureMessage(message, {
        level,
        contexts: {
            service: context,
        },
    });
}
/**
 * Create a transaction for performance monitoring
 * @param name Transaction name
 * @param op Operation name
 */
function startTransaction(name, op) {
    return Sentry.startTransaction({
        name,
        op,
    });
}
/**
 * Create a span for performance monitoring
 * @param transaction Parent transaction
 * @param op Operation name
 * @param description Description of the span
 */
function startSpan(transaction, op, description) {
    return transaction.startChild({
        op,
        description,
    });
}
/**
 * Close Sentry client and flush events
 * @param timeout Timeout in milliseconds
 */
async function closeSentry(timeout = 2000) {
    return Sentry.close(timeout);
}
/**
 * Get the current Sentry hub
 */
function getCurrentHub() {
    return Sentry.getCurrentHub();
}
/**
 * Create a span for AI model interactions
 * @param modelName The AI model being used (e.g., 'gpt-4o', 'claude-3')
 * @param operation The operation being performed (e.g., 'Generate Text', 'Create Content')
 * @param callback The AI function to execute within the span
 * @returns The result of the callback function
 */
async function withAISpan(modelName, operation, callback) {
    return Sentry.startSpan({
        op: "gen_ai.request",
        name: operation,
    }, async (span) => {
        // Set AI-specific attributes
        span.setAttribute("ai.model", modelName);
        span.setAttribute("ai.operation", operation);
        span.setAttribute("service.name", "smm-architect");
        try {
            const startTime = Date.now();
            const result = await callback(span);
            // Track success metrics
            const duration = Date.now() - startTime;
            span.setAttribute("ai.duration_ms", duration);
            span.setAttribute("ai.status", "success");
            return result;
        }
        catch (error) {
            // Track error metrics
            span.setAttribute("ai.status", "error");
            span.setAttribute("ai.error", error instanceof Error ? error.message : String(error));
            // Re-throw the error for proper error handling
            throw error;
        }
    });
}
exports.default = {
    initializeSentry,
    captureException,
    captureMessage,
    startTransaction,
    startSpan,
    closeSentry,
    getCurrentHub,
    withAISpan,
    withAgentSpan,
};
/**
 * Create a span for AI agent interactions specifically
 * @param agentName The name of the agent (e.g., 'research-agent', 'creative-agent')
 * @param modelName The AI model being used
 * @param task The task being performed
 * @param callback The AI function to execute within the span
 * @returns The result of the callback function
 */
async function withAgentSpan(agentName, modelName, task, callback) {
    return Sentry.startSpan({
        op: "gen_ai.agent",
        name: `${agentName}: ${task}`,
    }, async (span) => {
        // Set agent-specific attributes
        span.setAttribute("ai.model", modelName);
        span.setAttribute("ai.agent", agentName);
        span.setAttribute("ai.task", task);
        span.setAttribute("service.name", "smm-architect");
        span.setAttribute("service.component", "agent-layer");
        try {
            const startTime = Date.now();
            const result = await callback(span);
            // Track success metrics
            const duration = Date.now() - startTime;
            span.setAttribute("ai.duration_ms", duration);
            span.setAttribute("ai.status", "success");
            return result;
        }
        catch (error) {
            // Track error metrics
            span.setAttribute("ai.status", "error");
            span.setAttribute("ai.error", error instanceof Error ? error.message : String(error));
            // Capture the error for this specific agent
            Sentry.captureException(error, {
                tags: {
                    agent: agentName,
                    model: modelName,
                    task: task
                }
            });
            throw error;
        }
    });
}
//# sourceMappingURL=sentry-utils.js.map