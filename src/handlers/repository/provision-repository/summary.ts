import type { RepositoryOutputs, RepositoryPlan } from './type';

/**
 * Renders the provisioned repository as Markdown for the final summary
 * comment: the requested attributes next to the facts OpenTofu reported, as
 * readable fields instead of raw JSON.
 *
 * @param plan - Repository attributes the workflow provisioned.
 * @param outputs - Stack outputs read after the apply.
 * @returns Markdown appended to the summary comment.
 */
export const renderProvisionSummary = (
    plan: RepositoryPlan,
    outputs: RepositoryOutputs,
): string => {
    const repositoryUrl = `https://github.com/${plan.repository}`;

    return [
        '### Provisioned repository',
        '',
        `- **Repository:** [${plan.repository}](${repositoryUrl})`,
        `- **Visibility:** ${plan.visibility}`,
        `- **Description:** ${plan.description}`,
        `- **Topics:** ${
            plan.topics.length > 0 ? plan.topics.join(', ') : 'none'
        }`,
        `- **Default branch:** ${outputs.repoDefaultBranch}`,
        `- **Repository ID:** ${outputs.repoId}`,
        `- **Clone (HTTPS):** ${outputs.repoHttpCloneUrl}`,
        `- **Clone (SSH):** ${outputs.repoSshCloneUrl}`,
    ].join('\n');
};
