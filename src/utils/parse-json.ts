import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

/**
 * Parses a JSON encoded dispatch input.
 *
 * @param raw - Raw JSON string taken from the workflow inputs.
 * @param subject - Human readable name used in the error message.
 * @returns The parsed value.
 * @throws ValidationError when the value is not valid JSON.
 */
export const parseJson = (raw: string, subject: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch (error) {
        logger.error({ err: error }, `Invalid ${subject} JSON`);

        throw new ValidationError(`Invalid ${subject} JSON`);
    }
};
