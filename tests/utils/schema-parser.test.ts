import { parseWithSchema } from '@/src/utils/schema-parser';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(2) });

describe('parseWithSchema', () => {
    it('should return the parsed value and drop unknown keys', () => {
        expect(
            parseWithSchema(schema, { name: 'ok', drop: 1 }, 'subject'),
        ).toEqual({ name: 'ok' });
    });

    it('should throw a validation error with the first schema issue', () => {
        expect(() => parseWithSchema(schema, { name: 'a' }, 'subject')).toThrow(
            ValidationError,
        );
        expect(() => parseWithSchema(schema, { name: 'a' }, 'subject')).toThrow(
            'subject: Too small: expected string to have >=2 characters',
        );
        expect(logger.error).toHaveBeenCalledWith(
            'subject: Too small: expected string to have >=2 characters',
        );
    });
});
