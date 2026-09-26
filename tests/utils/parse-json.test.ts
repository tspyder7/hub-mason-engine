import { parseJson } from '@/src/utils/parse-json';
import { logger } from 'hub-mason-core/utils/logger';

describe('parseJson', () => {
    it('should parse a JSON encoded value', () => {
        expect(parseJson('{"a":1}', 'context')).toEqual({ a: 1 });
    });

    it('should throw a validation error for invalid JSON', () => {
        expect(() => parseJson('{a:1}', 'context')).toThrow(
            'Invalid context JSON',
        );
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.anything() }),
            'Invalid context JSON',
        );
    });
});
