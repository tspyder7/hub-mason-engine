import { z } from 'zod';

export const repositoryNameSchema = z
    .string()
    .min(1, 'Repository name is required')
    .min(3, 'Repository name must be greater than 2 characters')
    .regex(/^\S+$/, 'Repository name should not contain empty spaces');

export const descriptionSchema = z
    .string()
    .min(1, 'Repository description is required');

/** Contract the workflow provisions from: `isPublic` flag and `topics` array. */
export const dispatchedRequestSchema = z.object({
    name: repositoryNameSchema,
    description: descriptionSchema,
    isPublic: z.boolean(),
    topics: z.array(z.string().min(1)),
});
