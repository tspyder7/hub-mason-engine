import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import { RequestError } from 'octokit';

import { toLoggableError } from './redact-secrets';

/**
 * Converts a GitHub 404 into a lifecycle `ValidationError` so a missing
 * issue or comment fails the request the same way as any other invalid input.
 *
 * @param subject - Human readable name used in the error message.
 * @param error - Error thrown by the GitHub API.
 * @throws ValidationError when the error is a 404, otherwise rethrows.
 */
export const asNotFound = (subject: string, error: unknown): never => {
    if (error instanceof RequestError && error.status === 404) {
        // Never log the raw error: its request headers carry the app token
        // and pino serializes every enumerable property.
        logger.error({ err: toLoggableError(error) }, `${subject} not found`);

        throw new ValidationError(`${subject} not found`);
    }

    throw error;
};
