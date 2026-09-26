import { closeIssue } from 'hub-mason-core/github/issues';
import { withUnlockedIssue } from 'hub-mason-core/github/issues/with-lock';
import { toStepError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { RouterMessages } from '@/src/utils/constants';
import { findActiveStep } from '@/src/utils/lifecycle';
import {
    postSummaryComment,
    syncStatusComment,
} from '@/src/workflow/workflow-reporter';
import { resolveRequestType } from './resolve-request-type';

import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type {
    HandlerInput,
    PortalInfo,
    WorkflowDispatch,
    WorkflowInputs,
} from '@/src/types/dispatch';

type Lifecycle = LifecycleManager<string>;

/**
 * Routes a dispatched request to its handler and owns the request lifecycle
 * outcome: the failing step is marked and reported, then the request is always
 * summarised and closed.
 *
 * @throws Never. Failures are reported on the portal issue and surfaced
 * through the process exit code.
 */
export const routeRequest = async (): Promise<void> => {
    const workflow = WorkflowContext.getInstance();
    let lifecycle: Lifecycle | undefined;
    let hasError = false;

    try {
        const requestType = resolveRequestType(workflow.inputs.context);

        const { validator, lifecycleModule, handler } =
            await importModules(requestType);

        const input = validator.validate(workflow.inputs);

        workflow.setDispatch(input.dispatch);
        lifecycle = lifecycleModule.createLifecycle(input.dispatch);

        logger.info(
            `Handling ${requestType} for request ${input.dispatch.requestId} in workflow run ${workflow.run.runId}`,
        );

        await handler.handle(input, lifecycle);
    } catch (error) {
        hasError = true;

        await reportFailure(error, lifecycle);
    } finally {
        await finalizeRun(lifecycle);
    }

    if (hasError) {
        process.exit(1);
    }
};

const importModules = async (
    requestType: string,
): Promise<{
    validator: {
        validate: (inputs: WorkflowInputs) => HandlerInput;
    };
    lifecycleModule: {
        createLifecycle: (dispatch: WorkflowDispatch) => Lifecycle;
    };
    handler: {
        handle: (input: HandlerInput, lifecycle: Lifecycle) => Promise<void>;
    };
}> => {
    const validator = (await import(
        /* @vite-ignore */
        `../handlers/${requestType}/request-validator`
    )) as {
        validate: (inputs: WorkflowInputs) => HandlerInput;
    };

    const lifecycleModule = (await import(
        /* @vite-ignore */
        `../handlers/${requestType}/lifecycle`
    )) as {
        createLifecycle: (dispatch: WorkflowDispatch) => Lifecycle;
    };

    const handler = (await import(
        /* @vite-ignore */
        `../handlers/${requestType}/handler`
    )) as {
        handle: (input: HandlerInput, lifecycle: Lifecycle) => Promise<void>;
    };

    return {
        validator,
        lifecycleModule,
        handler,
    };
};

const reportFailure = async (
    error: unknown,
    lifecycle: Lifecycle | undefined,
): Promise<void> => {
    logger.error({ err: error }, 'Workflow request handling failed');
    WorkflowContext.getInstance().setRunError(toStepError(error));

    if (!lifecycle) {
        return;
    }

    const active = findActiveStep(lifecycle);

    if (active) {
        await lifecycle.fail(active.id, error).catch((err: unknown) => {
            logger.error(
                { err },
                'Failed to mark the active step as failed on the portal issue',
            );
        });
    }

    lifecycle.cancelPending();

    await syncStatusComment(lifecycle).catch((err: unknown) => {
        logger.error(
            { err },
            'Failed to report the error on the portal status comment',
        );
    });
};

const finalizeRun = async (lifecycle: Lifecycle | undefined): Promise<void> => {
    const portal: PortalInfo | null = WorkflowContext.getInstance().portal;

    if (!lifecycle || !portal) {
        logger.warn(RouterMessages.UNVERIFIED_DISPATCH);
        return;
    }

    const issue = `${portal.owner}/${portal.repo}#${portal.issueNumber}`;

    await postSummaryComment(lifecycle).catch((err: unknown) => {
        logger.error({ err }, `Failed to post summary comment on ${issue}`);
    });

    await withUnlockedIssue({
        issueNumber: portal.issueNumber,
        repository: { owner: portal.owner, repo: portal.repo },
        fn: () =>
            closeIssue(
                { issueNumber: portal.issueNumber },
                { owner: portal.owner, repo: portal.repo },
            ),
    }).catch((err: unknown) => {
        logger.error({ err }, `Failed to close issue ${issue}`);
    });
};
