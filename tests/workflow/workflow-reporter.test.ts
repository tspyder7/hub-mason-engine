import { createGithubCommentReporter } from 'hub-mason-core/adapters/github/comment-reporter';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { createLifecycle } from '@/src/handlers/repository/provision-repository/lifecycle';
import {
    createWorkflowCommentReporter,
    postSummaryComment,
    resolveCommentTarget,
    syncStatusComment,
} from '@/src/workflow/workflow-reporter';

import {
    createContext,
    createWorkflowContext,
    WORKFLOW_OWNER,
    WORKFLOW_REPO,
    REQUEST_ID,
    RUN_ID,
} from '../fixtures/workflow-dispatch';

const { onTransitionMock, postSummaryMock } = vi.hoisted(() => ({
    onTransitionMock: vi.fn(),
    postSummaryMock: vi.fn(),
}));

vi.mock('hub-mason-core/adapters/github/comment-reporter', () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: postSummaryMock,
}));

const createManager = () => {
    const dispatch = createContext();
    WorkflowContext.getInstance().setDispatch(dispatch);

    return createLifecycle(dispatch);
};

describe('workflow-reporter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        WorkflowContext.reset();
        vi.unstubAllEnvs();
        createWorkflowContext();
        onTransitionMock.mockResolvedValue(undefined);
        postSummaryMock.mockResolvedValue(undefined);
    });

    describe('resolveCommentTarget', () => {
        it('should point the rendered comments at the workflow run', () => {
            WorkflowContext.getInstance().setDispatch(createContext());

            expect(resolveCommentTarget()).toEqual({
                repository: {
                    owner: 'acme',
                    repo: 'hub-mason-portal',
                },
                issueNumber: 7,
                meta: {
                    requestId: REQUEST_ID,
                    requestType: 'repository/provision-repository',
                    owner: WORKFLOW_OWNER,
                    repo: WORKFLOW_REPO,
                    runId: Number(RUN_ID),
                    actor: 'hub-mason-bot',
                },
            });
        });

        it('should return null when the dispatch is not verified', () => {
            expect(resolveCommentTarget()).toBeNull();
        });
    });

    describe('createWorkflowCommentReporter', () => {
        it('should mirror transitions into the portal status comment', async () => {
            const manager = createManager();
            const step = manager.steps[0]!;

            await createWorkflowCommentReporter().onTransition?.({
                step,
                from: 'pending',
                to: 'in-progress',
                all: manager.steps,
            });

            expect(createGithubCommentReporter).toHaveBeenCalledWith(
                expect.objectContaining({
                    repository: { owner: 'acme', repo: 'hub-mason-portal' },
                    issueNumber: 7,
                    meta: expect.objectContaining({ runId: 123 }),
                    emoji: expect.objectContaining({ pending: '⏳' }),
                    runError: null,
                }),
            );
            expect(onTransitionMock).toHaveBeenCalledWith(
                expect.objectContaining({ step, all: manager.steps }),
            );
        });

        it('should reuse the status comment created by the portal', async () => {
            const manager = createManager();

            await createWorkflowCommentReporter().onTransition?.({
                step: manager.steps[0]!,
                from: 'pending',
                to: 'pending',
                all: manager.steps,
            });

            const input = vi.mocked(createGithubCommentReporter).mock
                .calls[0]![0];

            expect(input.getCommentId?.()).toBe(42);

            input.setCommentId?.(77);

            expect(WorkflowContext.getInstance().statusCommentId).toBe(77);
            expect(input.getCommentId?.()).toBe(77);
        });

        it('should let the core reporter create a comment when the portal has none', async () => {
            const manager = createManager();
            const dispatch = createContext();
            const workflow = WorkflowContext.getInstance();

            workflow.setDispatch({
                ...dispatch,
                portal: { ...dispatch.portal, statusCommentId: null },
            });

            await createWorkflowCommentReporter().onTransition?.({
                step: manager.steps[0]!,
                from: 'pending',
                to: 'pending',
                all: manager.steps,
            });

            const input = vi.mocked(createGithubCommentReporter).mock
                .calls[0]![0];

            expect(input.getCommentId?.()).toBeUndefined();
        });

        it('should report the run error recorded by the router', async () => {
            const manager = createManager();
            WorkflowContext.getInstance().setRunError({ message: 'boom' });

            await createWorkflowCommentReporter().onTransition?.({
                step: manager.steps[0]!,
                from: 'pending',
                to: 'pending',
                all: manager.steps,
            });

            const input = vi.mocked(createGithubCommentReporter).mock
                .calls[0]![0];

            expect(input.runError).toEqual({ message: 'boom' });
        });

        it('should skip reporting when the dispatch is not verified', async () => {
            await createWorkflowCommentReporter().onTransition?.({
                step: {
                    id: 'provision-repository',
                    name: 'Provision repository',
                    status: 'pending',
                    details: [],
                },
                from: 'pending',
                to: 'pending',
                all: [],
            });

            expect(createGithubCommentReporter).not.toHaveBeenCalled();
            expect(onTransitionMock).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping comment reporting: the dispatch is not verified yet',
            );
        });

        it('should resolve when the core reporter has no transition handler', async () => {
            vi.mocked(createGithubCommentReporter).mockReturnValueOnce(
                {} as never,
            );
            const manager = createManager();

            await expect(
                createWorkflowCommentReporter().onTransition?.({
                    step: manager.steps[0]!,
                    from: 'pending',
                    to: 'pending',
                    all: manager.steps,
                }),
            ).resolves.toBeUndefined();
        });
    });

    describe('syncStatusComment', () => {
        it('should re-render the comment for the last step', async () => {
            const manager = createManager();

            await syncStatusComment(manager);

            const last = manager.steps[manager.steps.length - 1]!;

            expect(onTransitionMock).toHaveBeenCalledWith({
                step: last,
                from: last.status,
                to: last.status,
                all: manager.steps,
            });
        });

        it('should skip the reporter when the lifecycle has no steps', async () => {
            await syncStatusComment({ steps: [] });

            expect(onTransitionMock).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping status comment: the lifecycle has no steps',
            );
        });
    });

    describe('postSummaryComment', () => {
        it('should post the summary of the run on the portal issue', async () => {
            const manager = createManager();

            await postSummaryComment(manager);

            expect(postSummaryMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    repository: { owner: 'acme', repo: 'hub-mason-portal' },
                    issueNumber: 7,
                    steps: manager.steps,
                    runError: null,
                }),
            );
        });

        it('should skip the summary when the dispatch is not verified', async () => {
            await postSummaryComment({ steps: [] });

            expect(postSummaryMock).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping comment reporting: the dispatch is not verified yet',
            );
        });
    });
});
