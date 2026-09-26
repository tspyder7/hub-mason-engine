import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { resolveRequestType } from '@/src/router/resolve-request-type';
import { RequestType } from '@/src/utils/constants';

describe('resolve-request-type', () => {
    it('should resolve the handler of a supported request type', () => {
        const context = JSON.stringify({
            requestType: RequestType.PROVISION_REPOSITORY,
        });

        expect(resolveRequestType(context)).toBe(
            'repository/provision-repository',
        );
    });

    it('should throw when the context is empty', () => {
        expect(() => resolveRequestType('   ')).toThrow(ValidationError);
        expect(() => resolveRequestType('')).toThrow('Missing context input');
    });

    it('should throw when the context is not valid JSON', () => {
        expect(() => resolveRequestType('{a:1}')).toThrow(
            'Invalid context JSON',
        );
    });

    it('should throw when the request type is not a string', () => {
        expect(() =>
            resolveRequestType(JSON.stringify({ requestType: 1 })),
        ).toThrow('Unsupported request type: 1');
    });

    it('should throw when the request type has no handler', () => {
        expect(() =>
            resolveRequestType(JSON.stringify({ requestType: 'repository/x' })),
        ).toThrow('Unsupported request type: repository/x');
        expect(logger.error).toHaveBeenCalledWith(
            'Unsupported request type: repository/x',
        );
    });

    it('should throw when the context has no request type', () => {
        expect(() => resolveRequestType(JSON.stringify({}))).toThrow(
            'Unsupported request type: undefined',
        );
    });

    it('should throw when the context is not an object', () => {
        expect(() => resolveRequestType('null')).toThrow(
            'Unsupported request type: undefined',
        );
    });
});
