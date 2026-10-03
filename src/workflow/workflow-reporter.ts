import {
    renderStatusComment,
    renderSummary,
} from 'hub-mason-core/adapters/github/renderer';
import { addCommentToIssue } from 'hub-mason-core/github/issues/add-comment';
import { updateCommentOnIssue } from 'hub-mason-core/github/issues/update-comment';
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
 * Resolves where the workflow reports back to. `owner`, `repo` and `runId` in
 * the meta point at the engine workflow run, which turns the portal status
 * comment into a traceable link to this execution. Null until the dispatch has
 * been verified, so a request can never comment on an unverified portal issue.
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
        },
    };
};

/**
 * Renders the portal workflow run link so both executions stay traceable.
 * The core renderer only knows the engine run (via meta), which would
 * otherwise replace the portal run the portal wrote first.
 *
 * @returns Markdown line for the portal run, or null when unknown.
 */
export const renderPortalRunLine = (): string | null => {
    const portal = WorkflowContext.getInstance().portal;

    if (!portal?.runId) {
        return null;
    }

    return `Portal workflow run: [${portal.runId}](https://github.com/${portal.owner}/${portal.repo}/actions/runs/${portal.runId})`;
};

const withPortalRun = (body: string): string => {
    const line = renderPortalRunLine();

    return line ? `${body}\n\n${line}` : body;
};

/**
 * Creates a reporter that mirrors every lifecycle transition into the portal
 * status comment, reusing the comment the portal created on dispatch. Both
 * the portal run and the engine run stay visible: the engine run comes from
 * the core renderer, the portal run is appended.
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

        const body = withPortalRun(
            renderStatusComment({
                steps: event.all,
                meta: target.meta,
                emoji: workflow.stepEmoji,
                runError: workflow.runError,
            }),
        );

        await withUnlockedIssue({
            issueNumber: target.issueNumber,
            repository: target.repository,
            fn: async () => {
                const commentId = workflow.statusCommentId ?? undefined;

                if (commentId) {
                    await updateCommentOnIssue(
                        { commentId, comment: body },
                        target.repository,
                    );
                    return;
                }

                const newId = await addCommentToIssue(
                    { issueNumber: target.issueNumber, comment: body },
                    target.repository,
                );

                workflow.setStatusCommentId(newId);
            },
        });
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
 * The portal run line sits between the summary and the details so both runs
 * stay traceable.
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

    const summary = renderSummary({
        steps: lifecycle.steps,
        meta: target.meta,
        emoji: workflow.stepEmoji,
        runError: workflow.runError,
    });
    const portalLine = renderPortalRunLine();
    const details = workflow.summaryDetails;

    const parts = [summary];

    if (portalLine) {
        parts.push(portalLine);
    }

    if (details) {
        parts.push(details);
    }

    const body = parts.join('\n\n');

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
