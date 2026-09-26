import { closeIssue } from 'hub-mason-core/github/issues';
import { withUnlockedIssue } from 'hub-mason-core/github/issues/with-lock';
import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { routeRequest } from '@/src/router';
import {
    postSummaryComment,
    syncStatusComment,
} from '@/src/workflow/workflow-reporter';

import {
    createContext,
    createWorkflowContext,
    REQUEST_ID,
} from '../fixtures/workflow-dispatch';

const { validateMock, createLifecycleMock, handleMock } = vi.hoisted(() => ({
    validateMock: vi.fn(),
    createLifecycleMock: vi.fn(),
    handleMock: vi.fn(),
}));

const processExitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as never);

vi.mock(
    '@/src/handlers/repository/provision-repository/request-validator',
    () => ({
        validate: validateMock,
    }),
);

vi.mock('@/src/handlers/repository/provision-repository/lifecycle', () => ({
    createLifecycle: createLifecycleMock,
}));

vi.mock('@/src/handlers/repository/provision-repository/handler', () => ({
    handle: handleMock,
}));

vi.mock('@/src/workflow/workflow-reporter', () => ({
    postSummaryComment: vi.fn(),
    syncStatusComment: vi.fn(),
}));

vi.mock('hub-mason-core/github/issues', () => ({
    closeIssue: vi.fn(),
}));

vi.mock('hub-mason-core/github/issues/with-lock', () => ({
    withUnlockedIssue: vi.fn((input: { fn: () => Promise<unknown> }) =>
        input.fn(),
    ),
}));

const createManager = (
    statuses: string[] = ['completed', 'completed', 'in-progress'],
): LifecycleManager<string> => {
    const dispatch = createContext();

    return LifecycleManager.fromSnapshot<string>({
        snapshot: {
            ...dispatch.lifecycleSnapshot,
            steps: dispatch.lifecycleSnapshot.steps.map((step, index) => ({
                ...step,
                status: statuses[index] ?? 'pending',
            })),
        },
    });
};

describe('router', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        WorkflowContext.reset();
        vi.unstubAllEnvs();
        createWorkflowContext();

        vi.mocked(postSummaryComment).mockResolvedValue(undefined);
        vi.mocked(syncStatusComment).mockResolvedValue(undefined);
        vi.mocked(closeIssue).mockResolvedValue(undefined);
        vi.mocked(withUnlockedIssue).mockImplementation((input) => input.fn());
        validateMock.mockReturnValue({
            dispatch: createContext(),
            request: { name: 'identity-service' },
        });
        createLifecycleMock.mockReturnValue(createManager());
        handleMock.mockResolvedValue(undefined);
    });

    afterEach(() => {
        WorkflowContext.reset();
    });

    it('should route the dispatch to the handler of the request type', async () => {
        const lifecycle = createManager();
        createLifecycleMock.mockReturnValue(lifecycle);

        await routeRequest();

        expect(validateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                context: expect.any(String),
                request: expect.any(String),
            }),
        );
        expect(createLifecycleMock).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: REQUEST_ID }),
        );
        expect(handleMock).toHaveBeenCalledWith(
            expect.objectContaining({
                dispatch: expect.objectContaining({ requestId: REQUEST_ID }),
            }),
            lifecycle,
        );
        expect(WorkflowContext.getInstance().statusCommentId).toBe(42);
        expect(logger.info).toHaveBeenCalledWith(
            `Handling repository/provision-repository for request ${REQUEST_ID} in workflow run 123`,
        );
        expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should post the summary and close the portal issue on success', async () => {
        const lifecycle = createManager();
        createLifecycleMock.mockReturnValue(lifecycle);

        await routeRequest();

        expect(syncStatusComment).not.toHaveBeenCalled();
        expect(postSummaryComment).toHaveBeenCalledWith(lifecycle);
        expect(withUnlockedIssue).toHaveBeenCalledWith({
            issueNumber: 7,
            repository: { owner: 'acme', repo: 'hub-mason-portal' },
            fn: expect.any(Function),
        });
        expect(closeIssue).toHaveBeenCalledWith(
            { issueNumber: 7 },
            { owner: 'acme', repo: 'hub-mason-portal' },
        );
    });

    it('should reject an unsupported request type without reporting', async () => {
        WorkflowContext.reset();
        createWorkflowContext({ context: { requestType: 'repository/other' } });

        await routeRequest();

        expect(validateMock).not.toHaveBeenCalled();
        expect(postSummaryComment).not.toHaveBeenCalled();
        expect(closeIssue).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            'Skipping summary comment and issue closure: the dispatch was not verified',
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not report when the dispatch signature is invalid', async () => {
        const error = new ValidationError('invalid signature');
        validateMock.mockImplementation(() => {
            throw error;
        });

        await routeRequest();

        expect(createLifecycleMock).not.toHaveBeenCalled();
        expect(postSummaryComment).not.toHaveBeenCalled();
        expect(closeIssue).not.toHaveBeenCalled();
        expect(WorkflowContext.getInstance().runError).toEqual(
            expect.objectContaining({ message: 'invalid signature' }),
        );
        expect(logger.error).toHaveBeenCalledWith(
            { err: error },
            'Workflow request handling failed',
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should fail the active step, cancel the rest and report on the portal issue', async () => {
        const error = new Error('plan failed');
        const lifecycle = createManager();
        createLifecycleMock.mockReturnValue(lifecycle);
        handleMock.mockRejectedValue(error);

        await routeRequest();

        expect(
            lifecycle.steps.find(({ id }) => id === 'provision-repository'),
        ).toMatchObject({
            status: 'failed',
            error: expect.objectContaining({ message: 'plan failed' }),
        });
        expect(syncStatusComment).toHaveBeenCalledWith(lifecycle);
        expect(WorkflowContext.getInstance().runError).toEqual(
            expect.objectContaining({ message: 'plan failed' }),
        );
        expect(postSummaryComment).toHaveBeenCalledWith(lifecycle);
        expect(closeIssue).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should skip the step failure when no step is active', async () => {
        const lifecycle = createManager([
            'completed',
            'completed',
            'completed',
        ]);
        const failSpy = vi.spyOn(lifecycle, 'fail');
        createLifecycleMock.mockReturnValue(lifecycle);
        handleMock.mockRejectedValue(new Error('plan failed'));

        await routeRequest();

        expect(failSpy).not.toHaveBeenCalled();
        expect(syncStatusComment).toHaveBeenCalledWith(lifecycle);
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should log when marking the active step as failed fails', async () => {
        const lifecycle = createManager();
        vi.spyOn(lifecycle, 'fail').mockRejectedValueOnce(
            new Error('step failed'),
        );
        createLifecycleMock.mockReturnValue(lifecycle);
        handleMock.mockRejectedValue(new Error('plan failed'));

        await routeRequest();

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'step failed' }),
            }),
            'Failed to mark the active step as failed on the portal issue',
        );
    });

    it('should log when reporting the error on the comment fails', async () => {
        handleMock.mockRejectedValue(new Error('plan failed'));
        vi.mocked(syncStatusComment).mockRejectedValueOnce(
            new Error('comment failed'),
        );

        await routeRequest();

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'comment failed' }),
            }),
            'Failed to report the error on the portal status comment',
        );
    });

    it('should log when the summary comment fails', async () => {
        handleMock.mockRejectedValue(new Error('plan failed'));
        vi.mocked(postSummaryComment).mockRejectedValueOnce(
            new Error('summary failed'),
        );

        await routeRequest();

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'summary failed' }),
            }),
            'Failed to post summary comment on acme/hub-mason-portal#7',
        );
    });

    it('should log when closing the issue fails', async () => {
        handleMock.mockRejectedValue(new Error('plan failed'));
        vi.mocked(withUnlockedIssue).mockRejectedValueOnce(
            new Error('close failed'),
        );

        await routeRequest();

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: expect.objectContaining({ message: 'close failed' }),
            }),
            'Failed to close issue acme/hub-mason-portal#7',
        );
    });
});
