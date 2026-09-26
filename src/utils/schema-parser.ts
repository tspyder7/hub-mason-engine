import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { z } from 'zod';

/**
 * Parses a value with a schema and converts failures into the lifecycle
 * `ValidationError` so every rejected input fails the request the same way.
 *
 * @param schema - Zod schema describing the expected shape.
 * @param value - Untrusted value coming from the dispatch inputs.
 * @param subject - Human readable name used in the error message.
 * @returns The parsed value.
 * @throws ValidationError when the value does not match the schema.
 */
export const parseWithSchema = <Schema extends z.ZodType>(
    schema: Schema,
    value: unknown,
    subject: string,
): z.infer<Schema> => {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        const message = `${subject}: ${parsed.error.issues[0]!.message}`;

        logger.error(message);

        throw new ValidationError(message);
    }

    return parsed.data;
};
