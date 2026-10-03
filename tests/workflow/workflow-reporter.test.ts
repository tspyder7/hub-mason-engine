import {
    renderStatusComment,
    renderSummary,
} from 'hub-mason-core/adapters/github/renderer';
import { addCommentToIssue } from 'hub-mason-core/github/issues/add-comment';
import { updateCommentOnIssue } from 'hub-mason-core/github/issues/update-comment';
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
    createDispatch,
    resetWorkflow,
    WORKFLOW_OWNER,
    WORKFLOW_REPO,
    REQUEST_ID,
    RUN_ID,
    PORTAL_RUN_ID,
} from '../fixtures/workflow-dispatch';

vi.mock('hub-mason-core/adapters/github/renderer', () => ({
    renderStatusComment: vi.fn(() => 'STATUS BODY'),
    renderSummary: vi.fn(() => 'SUMMARY BODY'),
}));

vi.mock('hub-mason-core/github/issues/add-comment', () => ({
    addCommentToIssue: vi.fn(async () => 77),
}));

vi.mock('hub-mason-core/github/issues/update-comment', () => ({
    updateCommentOnIssue: vi.fn(async () => undefined),
}));

vi.mock('hub-mason-core/github/issues/with-lock', async () =>
    (await import('../fixtures/mocks')).withUnlockedIssueMockModule(),
);

const createManager = () => createLifecycle(createDispatch());

describe('workflow-reporter', () => {
    beforeEach(() => {
        resetWorkflow();
        vi.mocked(addCommentToIssue).mockResolvedValue(77);
        vi.mocked(updateCommentOnIssue).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
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
                    portal: {
                        owner: 'acme',
                        repo: 'hub-mason-portal',
                        runId: PORTAL_RUN_ID,
                    },
                    engine: {
                        owner: WORKFLOW_OWNER,
                        repo: WORKFLOW_REPO,
                        runId: Number(RUN_ID),
                    },
                },
            });
        });

        it('should omit portal when the dispatch carries no portal run', () => {
            const dispatch = createContext();

            WorkflowContext.getInstance().setDispatch({
                ...dispatch,
                portal: { ...dispatch.portal, runId: null },
            });

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
                    portal: undefined,
                    engine: {
                        owner: WORKFLOW_OWNER,
                        repo: WORKFLOW_REPO,
                        runId: Number(RUN_ID),
                    },
                },
            });
        });

        it('should return null when the dispatch is not verified', () => {
            expect(resolveCommentTarget()).toBeNull();
        });
    });

    describe('createWorkflowCommentReporter', () => {
        it('should render the status comment without extra portal line', async () => {
            const manager = createManager();
            const step = manager.steps[0]!;

            await createWorkflowCommentReporter().onTransition?.({
                step,
                from: 'pending',
                to: 'in-progress',
                all: manager.steps,
            });

            expect(renderStatusComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    steps: manager.steps,
                    meta: expect.objectContaining({ runId: 123 }),
                    runError: null,
                }),
            );
            expect(updateCommentOnIssue).toHaveBeenCalledWith(
                {
                    commentId: 42,
                    comment: 'STATUS BODY',
                },
                { owner: 'acme', repo: 'hub-mason-portal' },
            );
            expect(addCommentToIssue).not.toHaveBeenCalled();
        });

        it('should create a comment when the portal has none', async () => {
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

            expect(addCommentToIssue).toHaveBeenCalledWith(
                {
                    issueNumber: 7,
                    comment: expect.stringContaining('STATUS BODY'),
                },
                { owner: 'acme', repo: 'hub-mason-portal' },
            );
            expect(workflow.statusCommentId).toBe(77);
            expect(updateCommentOnIssue).not.toHaveBeenCalled();
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

            expect(renderStatusComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    runError: { message: 'boom' },
                }),
            );
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

            expect(renderStatusComment).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping comment reporting: the dispatch is not verified yet',
            );
        });
    });

    describe('syncStatusComment', () => {
        it('should re-render the comment for the last step', async () => {
            const manager = createManager();

            await syncStatusComment(manager);

            expect(renderStatusComment).toHaveBeenCalledWith(
                expect.objectContaining({ steps: manager.steps }),
            );
            expect(updateCommentOnIssue).toHaveBeenCalled();
        });

        it('should skip the reporter when the lifecycle has no steps', async () => {
            await syncStatusComment({ steps: [] });

            expect(renderStatusComment).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping status comment: the lifecycle has no steps',
            );
        });
    });

    describe('postSummaryComment', () => {
        it('should post the summary on the portal issue', async () => {
            const manager = createManager();

            await postSummaryComment(manager);

            expect(renderSummary).toHaveBeenCalledWith(
                expect.objectContaining({ steps: manager.steps }),
            );
            expect(addCommentToIssue).toHaveBeenCalledWith(
                {
                    issueNumber: 7,
                    comment: 'SUMMARY BODY',
                },
                { owner: 'acme', repo: 'hub-mason-portal' },
            );
        });

        it('should skip the summary when the dispatch is not verified', async () => {
            WorkflowContext.reset();

            await postSummaryComment({ steps: [] });

            expect(renderSummary).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Skipping comment reporting: the dispatch is not verified yet',
            );
        });

        it('should append the handler supplied details after the summary', async () => {
            const manager = createManager();

            WorkflowContext.getInstance().setSummaryDetails(
                '- **Repository:** acme/identity-service',
            );

            await postSummaryComment(manager);

            expect(renderSummary).toHaveBeenCalledWith(
                expect.objectContaining({ steps: manager.steps }),
            );
            expect(addCommentToIssue).toHaveBeenCalledWith(
                {
                    issueNumber: 7,
                    comment:
                        'SUMMARY BODY\n\n- **Repository:** acme/identity-service',
                },
                { owner: 'acme', repo: 'hub-mason-portal' },
            );
        });
    });
});
