import { z } from 'zod';

import {
    descriptionSchema,
    repositoryNameSchema,
} from './provision-request.schema';

/**
 * Shape still dispatched by portals before the request mapping landed, i.e.
 * the raw issue form.
 *
 * TODO(hub-mason): remove once every deployed portal dispatches `isPublic` and the `topics` array.
 */
export const issueRequestSchema = z.object({
    name: repositoryNameSchema,
    description: descriptionSchema,
    visibility: z.array(z.string()),
    topics: z.string().optional(),
});
