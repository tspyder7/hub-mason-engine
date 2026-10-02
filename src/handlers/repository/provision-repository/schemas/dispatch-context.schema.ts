import { z } from 'zod';

import { portalInfoSchema } from './portal.schema';

/**
 * Signed dispatch context shape the workflow validates the portal locator from.
 * Read from the raw payload: the core context schema strips unknown keys.
 */
export const signedContextSchema = z.object({
    requestId: z.string().min(1),
    requestType: z.string().min(1),
    portal: portalInfoSchema,
});
