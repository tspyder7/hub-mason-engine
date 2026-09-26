import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import values from 'lodash/values';

import { RequestType, ResolveRequestTypeMessages } from '@/src/utils/constants';
import { parseJson } from '@/src/utils/parse-json';

import type { RequestTypeName } from '@/src/utils/constants';

const SUPPORTED_REQUEST_TYPES: readonly RequestTypeName[] = values(RequestType);

/**
 * Resolves the handler to run from the request type in the dispatch context.
 *
 * The value is only used to pick a module from this repository, never to grant
 * access, and it is restricted to the supported request types. The handler
 * still verifies the dispatch signature before it acts on the request.
 *
 * @param context - Raw JSON encoded dispatch context.
 * @returns The request type owning the handler.
 * @throws ValidationError when the context or the request type is unsupported.
 */
export const resolveRequestType = (context: string): RequestTypeName => {
    if (!context.trim()) {
        throw new ValidationError(ResolveRequestTypeMessages.MISSING_CONTEXT);
    }

    const requestType = (
        parseJson(context, 'context') as { requestType?: unknown } | null
    )?.requestType;

    if (
        typeof requestType !== 'string' ||
        !SUPPORTED_REQUEST_TYPES.includes(requestType as RequestTypeName)
    ) {
        logger.error(`Unsupported request type: ${String(requestType)}`);

        throw new ValidationError(
            `Unsupported request type: ${String(requestType)}`,
        );
    }

    return requestType as RequestTypeName;
};
