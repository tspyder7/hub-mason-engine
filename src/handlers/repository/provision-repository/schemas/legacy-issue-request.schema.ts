import { z } from 'zod';

import {
    descriptionSchema,
    repositoryNameSchema,
} from './provision-request.schema';

/**
 * Shape still dispatched by hub-mason-portal before the request mapping
 * landed, i.e. the raw issue form.
 *
 * TODO(hub-mason): remove this schema once every deployed portal dispatches
 * the `isPublic` and `topics` array shape.
 */
export const issueRequestSchema = z.object({
    name: repositoryNameSchema,
    description: descriptionSchema,
    visibility: z.array(z.string()),
    topics: z.string().optional(),
});
