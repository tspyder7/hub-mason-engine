import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { syncStatusComment } from '@/src/workflow/workflow-reporter';
import { findActiveStep } from '@/src/utils/lifecycle';
import { HandlerMessages } from '@/src/utils/constants';
import { planRepository } from './provision';
import { parseRequestPayload, verifyPortalIssue } from './request-validator';

import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type { HandlerInput, PortalInfo } from '@/src/types/dispatch';

const recordDispatch = (dispatch: HandlerInput['dispatch']): void => {
    logger.info(`Request-Id: ${dispatch.requestId}`);
    logger.info(`Request type: ${dispatch.requestType}`);
    logger.info(`Issued at: ${dispatch.issuedAt}`);
    logger.info('Dispatch signature: verified');
};

const verifyPortalIssueStep = async (portal: PortalInfo): Promise<void> => {
    const issue = await verifyPortalIssue(portal);

    logger.info(
        `Issue: #${issue.number} "${issue.title}" (${issue.state}, locked: ${issue.locked})`,
    );

    if (issue.commentId) {
        logger.info(`Status comment: #${issue.commentId}`);
    }
};

const registerWorkflowRun = async (
    lifecycle: LifecycleManager<string>,
): Promise<void> => {
    const { run } = WorkflowContext.getInstance();

    logger.info(`Workflow run: ${run.runId} (attempt ${run.attempt})`);
    logger.info(`Workflow run URL: ${run.runUrl}`);

    await syncStatusComment(lifecycle);
};

/**
 * Runs the workflow work of a provision repository request.
 *
 * The workflow takes over the step the portal left in flight: it confirms the
 * portal issue and its status comment, records the workflow run for
 * traceability, and then plans the repository. Progress is logged, while the
 * lifecycle step itself only moves between statuses. Success completes the
 * step, failure marks it failed with the error.
 *
 * @param input - Verified dispatch and provisioning request.
 * @param lifecycle - Lifecycle resumed from the portal snapshot.
 */
export const handle = async (
    input: HandlerInput,
    lifecycle: LifecycleManager<string>,
): Promise<void> => {
    const workflow = WorkflowContext.getInstance();
    const request = parseRequestPayload(input.request);
    const active = findActiveStep(lifecycle);

    if (!active) {
        throw new ValidationError(HandlerMessages.NO_ACTIVE_STEP);
    }

    logger.info(
        `Provisioning ${workflow.run.owner}/${request.name} for request ${input.dispatch.requestId}`,
    );

    await lifecycle.run(active.id, async () => {
        recordDispatch(input.dispatch);
        await verifyPortalIssueStep(input.dispatch.portal);
        await registerWorkflowRun(lifecycle);
        await planRepository({ request, owner: workflow.run.owner });
    });
};
