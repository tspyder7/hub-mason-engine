import * as github from '@actions/github';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';

import { WorkflowConfigMessages } from '@/src/utils/constants';

import type { WorkflowInputs } from '@/src/types/dispatch';

/**
 * Identity of the workflow run that is currently executing.
 */
export type WorkflowRun = {
    runId: number;
    runUrl: string;
    owner: string;
    repo: string;
    attempt: number;
};

const DEFAULT_SERVER_URL = 'https://github.com';
const DEFAULT_ATTEMPT = '1';

/**
 * Reads the dispatch inputs from the `workflow_dispatch` event payload.
 * The portal hands the request and context over as JSON encoded input
 * strings.
 *
 * @returns Raw request and context inputs.
 */
export const getWorkflowInputs = (): WorkflowInputs => {
    const inputs = github.context.payload['inputs'] as
        { request?: unknown; context?: unknown } | undefined;

    return {
        request: typeof inputs?.request === 'string' ? inputs.request : '',
        context: typeof inputs?.context === 'string' ? inputs.context : '',
    };
};

/**
 * Resolves the workflow run that is currently executing.
 *
 * The run identity is what makes every comment written by the workflow
 * traceable back to this workflow run.
 *
 * @returns Run id, URL, repository and attempt number.
 * @throws When the workflow run environment is incomplete.
 */
export const getWorkflowRun = (): WorkflowRun => {
    const runId = process.env['GITHUB_RUN_ID'];
    const [owner, repo] = (process.env['GITHUB_REPOSITORY'] ?? '').split('/');

    if (!runId || !owner || !repo) {
        throw new ValidationError(
            WorkflowConfigMessages.MISSING_RUN_ENVIRONMENT,
        );
    }

    const serverUrl = process.env['GITHUB_SERVER_URL'] ?? DEFAULT_SERVER_URL;
    const attempt = process.env['GITHUB_RUN_ATTEMPT'] ?? DEFAULT_ATTEMPT;

    return {
        runId: Number(runId),
        runUrl: `${serverUrl}/${owner}/${repo}/actions/runs/${runId}`,
        owner,
        repo,
        attempt: Number(attempt),
    };
};
