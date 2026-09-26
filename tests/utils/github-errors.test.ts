import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import { RequestError } from 'octokit';

import { asNotFound } from '@/src/utils/github-errors';

const notFound = () =>
    new RequestError('Not Found', 404, {
        request: {
            method: 'GET',
            url: '/repos/acme/hub-mason-portal',
            headers: {},
        },
    });

describe('asNotFound', () => {
    it('should throw a validation error for a 404', () => {
        expect(() => asNotFound('Issue acme/repo#7', notFound())).toThrow(
            ValidationError,
        );
        expect(() => asNotFound('Issue acme/repo#7', notFound())).toThrow(
            'Issue acme/repo#7 not found',
        );
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.anything() }),
            'Issue acme/repo#7 not found',
        );
    });

    it('should rethrow non-404 errors', () => {
        const error = new Error('Network issue');

        expect(() => asNotFound('Issue acme/repo#7', error)).toThrow(
            'Network issue',
        );
    });
});
