import { z } from 'zod';

import { portalInfoSchema } from './portal.schema';

/**
 * Signed dispatch context shape the workflow validates the portal locator
 * from. The core context schema strips unknown keys, so the locator is read
 * from the raw payload here.
 */
export const signedContextSchema = z.object({
    requestId: z.string().min(1),
    requestType: z.string().min(1),
    portal: portalInfoSchema,
});
