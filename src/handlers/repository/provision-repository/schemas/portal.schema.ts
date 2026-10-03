import { z } from 'zod';

export const portalInfoSchema = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    issueNumber: z.number().int().positive(),
    statusCommentId: z.number().int().positive().nullable(),
    runId: z.number().int().positive().nullish(),
});
