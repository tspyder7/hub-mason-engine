import { z } from 'zod';

/**
 * Portal issue coordinates carried inside the dispatch context.
 */
export const portalInfoSchema = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    issueNumber: z.number().int().positive(),
    statusCommentId: z.number().int().positive().nullable(),
});
