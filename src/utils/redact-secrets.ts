import { toStepError } from 'hub-mason-core/lifecycle/core/errors';
import { RequestError } from 'octokit';

import type { StepError } from 'hub-mason-core/lifecycle/core/types';

const REDACTED = '[REDACTED]' as const;

/**
 * Environment variables whose values must never reach logs or portal
 * comments. `HUB_MASON_GITHUB_APP_TOKEN` is included even though this
 * codebase never reads it: the workflow still exports it, so a stray
 * reflection (provider URLs, API errors) could otherwise leak it.
 */
const SECRET_ENV_VARS = [
    'HUB_MASON_TOP_SECRET_TOKEN',
    'HUB_MASON_GITHUB_APP_TOKEN',
    'HUB_MASON_WORKFLOW_SECRET_KEY',
] as const;

/**
 * Replaces every occurrence of each known secret value with a placeholder.
 * Value-based (not name-based), so tokens embedded in URLs such as
 * `https://<token>@github.com/...` are covered too. Unset or empty
 * variables are skipped.
 *
 * @param text - Any string about to be logged or thrown.
 * @param extraSecrets - Additional secret values to redact (e.g. the active
 * stack token when `tokenEnvVar` is free-form and not in `SECRET_ENV_VARS`).
 * @returns The text with secret values redacted.
 */
export const redactSecrets = (
    text: string,
    extraSecrets: readonly (string | undefined | null)[] = [],
): string => {
    let redacted = text;

    for (const name of SECRET_ENV_VARS) {
        const value = process.env[name];

        if (!value) {
            continue;
        }

        redacted = redacted.split(value).join(REDACTED);
    }

    for (const value of extraSecrets) {
        if (!value) {
            continue;
        }

        redacted = redacted.split(value).join(REDACTED);
    }

    return redacted;
};

/**
 * Log-safe error shape: message, stack, status and code only. Raw error
 * objects (notably Octokit `RequestError`) carry `request.headers`
 * with bearer tokens, and pino serializes every enumerable property —
 * so they must never be logged directly.
 */
export type RedactedError = {
    message: string;
    stack?: string;
    status?: number;
    code?: string | number;
};

/**
 * Converts any thrown value into a log-safe plain object with secrets
 * redacted. Headers, request configs and other untrusted properties are
 * dropped; only message, stack, status and code survive.
 *
 * @param error - Whatever was caught.
 * @param extraSecrets - Additional secret values to redact.
 * @returns Plain object safe for `logger.error({ err })` and assertions.
 */
export const toRedactedError = (
    error: unknown,
    extraSecrets: readonly (string | undefined | null)[] = [],
): RedactedError => {
    if (error instanceof RequestError) {
        return {
            message: redactSecrets(error.message, extraSecrets),
            status: error.status,
        };
    }

    if (error instanceof Error) {
        const message = redactSecrets(error.message, extraSecrets);
        const code: unknown = (error as { code?: unknown }).code;

        return {
            message,
            stack: redactSecrets(error.stack ?? message, extraSecrets),
            ...(typeof code === 'string' || typeof code === 'number'
                ? { code }
                : {}),
        };
    }

    return { message: redactSecrets(String(error), extraSecrets) };
};

/**
 * Converts any thrown value into a step error safe for portal comments.
 * The lifecycle reporter renders message and stack into the status and
 * summary comments, so both get the same redaction as the logs.
 *
 * @param error - Whatever was caught.
 * @param extraSecrets - Additional secret values to redact.
 * @returns Step error with secrets redacted.
 */
export const toRedactedStepError = (
    error: unknown,
    extraSecrets: readonly (string | undefined | null)[] = [],
): StepError => {
    const stepError = toStepError(error);

    return {
        ...stepError,
        message: redactSecrets(stepError.message, extraSecrets),
        stack:
            stepError.stack === undefined
                ? undefined
                : redactSecrets(stepError.stack, extraSecrets),
    };
};
