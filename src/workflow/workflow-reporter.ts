import {
    createGithubCommentReporter,
    postSummaryComment as postSummaryCommentCore,
} from 'hub-mason-core/adapters/github/comment-reporter';
import { renderSummary } from 'hub-mason-core/adapters/github/renderer';
import { addCommentToIssue } from 'hub-mason-core/github/issues/add-comment';
import { withUnlockedIssue } from 'hub-mason-core/github/issues/with-lock';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { WorkflowReporterMessages } from '@/src/utils/constants';

import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type {
    Reporter,
    WorkflowMeta,
} from 'hub-mason-core/lifecycle/core/types';
import type { Repository } from 'hub-mason-core/types/repository';

export type CommentTarget = {
    repository: Repository;
    issueNumber: number;
    meta: WorkflowMeta;
};

type Lifecycle = Pick<LifecycleManager<string>, 'steps'>;

/**
 * Resolves where the workflow reports back to. `portal` and `engine` in the
 * meta carry both workflow runs, rendering as `[portal] ---> [engine]` once
 * delegated. Flat `owner`/`repo`/`runId` stay as the engine run for backward
 * compatibility. Null until the dispatch has been verified, so a request can
 * never comment on an unverified portal issue.
 *
 * @returns The comment target, or null when the dispatch is not verified.
 */
export const resolveCommentTarget = (): CommentTarget | null => {
    const workflow = WorkflowContext.getInstance();
    const dispatch = workflow.dispatch;

    if (!dispatch) {
        return null;
    }

    const { portal } = dispatch;

    return {
        repository: { owner: portal.owner, repo: portal.repo },
        issueNumber: portal.issueNumber,
        meta: {
            requestId: dispatch.requestId,
            requestType: dispatch.requestType,
            owner: workflow.run.owner,
            repo: workflow.run.repo,
            runId: workflow.run.runId,
            actor: dispatch.actor,
            portal: portal.runId
                ? {
                      owner: portal.owner,
                      repo: portal.repo,
                      runId: portal.runId,
                  }
                : undefined,
            engine: {
                owner: workflow.run.owner,
                repo: workflow.run.repo,
                runId: workflow.run.runId,
            },
        },
    };
};

/**
 * Creates a reporter that mirrors every lifecycle transition into the portal
 * status comment, reusing the comment the portal created on dispatch.
 *
 * @returns Reporter wired to the portal issue of the current run.
 */
export const createWorkflowCommentReporter = (): Reporter<string> => ({
    onTransition: async (event) => {
        const workflow = WorkflowContext.getInstance();
        const target = resolveCommentTarget();

        if (!target) {
            logger.warn(WorkflowReporterMessages.UNVERIFIED_DISPATCH);
            return;
        }

        const reporter = createGithubCommentReporter<string>({
            repository: target.repository,
            issueNumber: target.issueNumber,
            meta: target.meta,
            emoji: workflow.stepEmoji,
            runError: workflow.runError,
            getCommentId: () => workflow.statusCommentId ?? undefined,
            setCommentId: (commentId: number) => {
                workflow.setStatusCommentId(commentId);
            },
        });

        await reporter.onTransition?.(event);
    },
});

/**
 * Re-renders the portal status comment for the current lifecycle state. Needed
 * after mutations that emit no transition of their own, such as cancelling the
 * remaining steps on failure.
 *
 * @param lifecycle - Lifecycle of the current run.
 */
export const syncStatusComment = async (
    lifecycle: Lifecycle,
): Promise<void> => {
    const steps = lifecycle.steps;
    const last = steps[steps.length - 1];

    if (!last) {
        logger.warn(WorkflowReporterMessages.NO_STEPS);
        return;
    }

    await createWorkflowCommentReporter().onTransition?.({
        step: last,
        from: last.status,
        to: last.status,
        all: steps,
    });
};

/**
 * Posts the closing summary comment on the portal issue. Handler-supplied
 * details, such as the outputs of a provisioning run, are appended to the
 * rendered summary so they report as readable Markdown instead of raw JSON.
 *
 * @param lifecycle - Lifecycle of the current run.
 */
export const postSummaryComment = async (
    lifecycle: Lifecycle,
): Promise<void> => {
    const workflow = WorkflowContext.getInstance();
    const target = resolveCommentTarget();

    if (!target) {
        logger.warn(WorkflowReporterMessages.UNVERIFIED_DISPATCH);
        return;
    }

    const summaryCommentProps = {
        repository: target.repository,
        issueNumber: target.issueNumber,
        steps: lifecycle.steps,
        meta: target.meta,
        emoji: workflow.stepEmoji,
        runError: workflow.runError,
    };
    const details = workflow.summaryDetails;

    if (!details) {
        await postSummaryCommentCore(summaryCommentProps);
        return;
    }

    const body = `${renderSummary(summaryCommentProps)}\n\n${details}`;

    await withUnlockedIssue({
        issueNumber: target.issueNumber,
        repository: target.repository,
        fn: () =>
            addCommentToIssue(
                { issueNumber: target.issueNumber, comment: body },
                target.repository,
            ),
    });
};
