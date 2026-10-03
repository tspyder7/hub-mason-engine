import type { RepositoryOutputs, RepositoryPlan } from './type';

/**
 * Collapses newlines so user-controlled values cannot inject extra Markdown
 * blocks or list items into the summary comment.
 *
 * @param value - Raw interpolated value.
 * @returns Single-line value.
 */
const toInline = (value: string): string => value.replace(/\r\n|\r|\n/g, ' ');

const toInlineCode = (value: string): string =>
    `\`${toInline(value).replace(/`/g, "'")}\``;

/**
 * Escapes Markdown link syntax (`]`, `(`, `)`, `\`) in user-controlled values.
 * Unescaped, these break the surrounding repository link or inject Markdown
 * into the summary comment.
 *
 * @param value - Raw interpolated value.
 * @returns Escaped single-line value.
 */
const escapeMarkdown = (value: string): string =>
    toInline(value).replace(/([\\[\]()])/g, '\\$1');

/**
 * Builds a repository URL with each path segment percent-encoded, so `)`,
 * spaces or newlines cannot close the Markdown link early. `encodeURIComponent`
 * leaves `(` and `)` untouched, so they are encoded explicitly.
 *
 * @param repository - `owner/name` value from the plan.
 * @returns Absolute GitHub URL.
 */
const toRepositoryUrl = (repository: string): string =>
    `https://github.com/${toInline(repository)
        .split('/')
        .map((part) =>
            encodeURIComponent(part)
                .replace(/\(/g, '%28')
                .replace(/\)/g, '%29'),
        )
        .join('/')}`;

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
    const repositoryUrl = toRepositoryUrl(plan.repository);

    return [
        '### Provisioned repository',
        '',
        `- **Repository:** [${escapeMarkdown(plan.repository)}](${repositoryUrl})`,
        `- **Default branch:** ${escapeMarkdown(outputs.repoDefaultBranch)}`,
        `- **Repository ID:** ${toInlineCode(outputs.repoId)}`,
        `- **Clone (HTTPS):** ${toInline(outputs.repoHttpCloneUrl)}`,
        `- **Clone (SSH):** ${toInlineCode(outputs.repoSshCloneUrl)}`,
    ].join('\n');
};
