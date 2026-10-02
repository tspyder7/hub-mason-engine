import { parseJson } from '@/src/utils/parse-json';
import { parseWithSchema } from '@/src/utils/schema-parser';

import { z } from 'zod';

import type { RepositoryOutputs } from './type';

const outputValue = <Schema extends z.ZodType>(schema: Schema) =>
    z.object({ value: schema });

const repositoryOutputsSchema = z
    .object({
        repo_id: outputValue(z.union([z.string(), z.number()])),
        repo_name: outputValue(z.string()),
        repo_http_clone_url: outputValue(z.string()),
        repo_ssh_clone_url: outputValue(z.string()),
        repo_default_branch: outputValue(z.string()),
    })
    .transform((outputs) => ({
        repoId: String(outputs.repo_id.value),
        repoName: outputs.repo_name.value,
        repoHttpCloneUrl: outputs.repo_http_clone_url.value,
        repoSshCloneUrl: outputs.repo_ssh_clone_url.value,
        repoDefaultBranch: outputs.repo_default_branch.value,
    }));

/**
 * Parses the JSON output of `tofu output -json` into the repository facts the
 * summary comment reports; the schema also maps the snake_case stack outputs
 * onto the camelCase result.
 *
 * @param raw - Raw stdout of `tofu output -json`.
 * @returns The repository outputs of the applied stack.
 * @throws ValidationError when the output is not JSON or misses an output.
 */
export const parseRepositoryOutputs = (raw: string): RepositoryOutputs =>
    parseWithSchema(
        repositoryOutputsSchema,
        parseJson(raw, 'OpenTofu output'),
        'OpenTofu output',
    );
