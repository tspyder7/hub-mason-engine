import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import { RequestError } from 'octokit';

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
        logger.error({ err: error }, `${subject} not found`);

        throw new ValidationError(`${subject} not found`);
    }

    throw error;
};
