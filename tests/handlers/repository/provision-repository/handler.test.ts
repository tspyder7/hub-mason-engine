import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import * as provisionRepository from '@/src/handlers/repository/provision-repository/handler';
import { handle } from '@/src/handlers/repository/provision-repository/handler';
import { createLifecycle } from '@/src/handlers/repository/provision-repository/lifecycle';
import { planRepository } from '@/src/handlers/repository/provision-repository/provision';
import { verifyPortalIssue } from '@/src/handlers/repository/provision-repository/request-validator';

import {
    createContext,
    createWorkflowContext,
    createRequest,
    WORKFLOW_OWNER,
    RUN_ID,
    RUN_URL,
} from '../../../fixtures/workflow-dispatch';

import type {
    ProvisionRepositoryWorkflowRequest,
    RepositoryPlan,
} from '@/src/handlers/repository/provision-repository/type';
import type { RequestHandler } from '@/src/types/context';
import type { WorkflowDispatch, HandlerInput } from '@/src/types/dispatch';

const PROVISION_STEP = 'provision-repository';

const { onTransitionMock } = vi.hoisted(() => ({ onTransitionMock: vi.fn() }));

vi.mock('hub-mason-core/adapters/github/comment-reporter', () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: vi.fn(),
}));

vi.mock(
    '@/src/handlers/repository/provision-repository/request-validator',
    async (importOriginal) => {
        const original =
            await importOriginal<
                typeof import('@/src/handlers/repository/provision-repository/request-validator')
            >();

        return {
            ...original,
            verifyPortalIssue: vi.fn(),
        };
    },
);

vi.mock('@/src/handlers/repository/provision-repository/provision', () => ({
    planRepository: vi.fn(),
}));

const plan = (overrides: Partial<RepositoryPlan> = {}): RepositoryPlan => ({
    repository: `${WORKFLOW_OWNER}/identity-service`,
    visibility: 'private',
    topics: ['go', 'grpc'],
    description: 'Hosts the identity service',
    ...overrides,
});

const createInput = (
    request: ProvisionRepositoryWorkflowRequest = createRequest(),
): HandlerInput => {
    const dispatch = createContext();
    WorkflowContext.getInstance().setDispatch(dispatch);

    return { dispatch, request };
};

const completedSnapshot = (dispatch: WorkflowDispatch): WorkflowDispatch => ({
    ...dispatch,
    lifecycleSnapshot: {
        ...dispatch.lifecycleSnapshot,
        steps: dispatch.lifecycleSnapshot.steps.map((step) => ({
            ...step,
            status: 'completed',
            completedAt: step.completedAt ?? '2026-01-01T00:00:00.000Z',
        })),
    },
});

describe('provision-repository handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        WorkflowContext.reset();
        createWorkflowContext();
        onTransitionMock.mockResolvedValue(undefined);
        vi.mocked(planRepository).mockResolvedValue(plan());
        vi.mocked(verifyPortalIssue).mockResolvedValue({
            number: 7,
            title: 'Provision identity-service',
            state: 'open',
            locked: true,
            commentId: 42,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        WorkflowContext.reset();
    });

    it('should only expose the request handling contract', () => {
        const contract: RequestHandler = provisionRepository;

        expect(Object.keys(contract).sort()).toEqual(['handle']);
    });

    it('should finish the dispatched step and log the portal issue, the workflow run and the plan', async () => {
        const input = createInput();
        const lifecycle = createLifecycle(input.dispatch);

        await handle(input, lifecycle);

        expect(
            lifecycle.steps.find(({ id }) => id === PROVISION_STEP),
        ).toMatchObject({ status: 'completed', details: [] });
        expect(logger.info).toHaveBeenCalledWith(
            `Provisioning ${WORKFLOW_OWNER}/identity-service for request R-1`,
        );
        expect(logger.info).toHaveBeenCalledWith('Request-Id: R-1');
        expect(logger.info).toHaveBeenCalledWith(
            'Request type: repository/provision-repository',
        );
        expect(logger.info).toHaveBeenCalledWith(
            `Issued at: ${input.dispatch.issuedAt}`,
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Dispatch signature: verified',
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Issue: #7 "Provision identity-service" (open, locked: true)',
        );
        expect(logger.info).toHaveBeenCalledWith('Status comment: #42');
        expect(logger.info).toHaveBeenCalledWith(
            `Workflow run: ${RUN_ID} (attempt 1)`,
        );
        expect(logger.info).toHaveBeenCalledWith(
            `Workflow run URL: ${RUN_URL}`,
        );
        expect(planRepository).toHaveBeenCalledWith({
            request: createRequest(),
            owner: WORKFLOW_OWNER,
        });
    });

    it('should skip the status comment log when the portal has none', async () => {
        vi.mocked(verifyPortalIssue).mockResolvedValue({
            number: 7,
            title: 'Provision identity-service',
            state: 'open',
            locked: false,
            commentId: null,
        });
        const input = createInput();
        const lifecycle = createLifecycle(input.dispatch);

        await handle(input, lifecycle);

        expect(logger.info).toHaveBeenCalledWith(
            'Issue: #7 "Provision identity-service" (open, locked: false)',
        );
        expect(logger.info).not.toHaveBeenCalledWith(
            expect.stringContaining('Status comment:'),
        );
    });

    it('should re-validate the payload before provisioning', async () => {
        const input = createInput();
        const lifecycle = createLifecycle(input.dispatch);

        await expect(
            handle(
                { ...input, request: createRequest({ name: 'a' }) },
                lifecycle,
            ),
        ).rejects.toThrow(
            'Invalid provision repository request: Repository name must be greater than 2 characters',
        );
        expect(verifyPortalIssue).not.toHaveBeenCalled();
    });

    it('should throw when the snapshot has no in-progress step', async () => {
        const dispatch = completedSnapshot(createContext());
        WorkflowContext.getInstance().setDispatch(dispatch);
        const lifecycle = createLifecycle(dispatch);

        await expect(
            handle({ dispatch, request: createRequest() }, lifecycle),
        ).rejects.toThrow('The dispatched snapshot has no in-progress step');

        expect(verifyPortalIssue).not.toHaveBeenCalled();
        expect(planRepository).not.toHaveBeenCalled();
    });

    it('should mark the step failed when the portal issue is missing', async () => {
        vi.mocked(verifyPortalIssue).mockRejectedValue(
            new Error('Issue acme/hub-mason-portal#7 not found'),
        );
        const input = createInput();
        const lifecycle = createLifecycle(input.dispatch);

        await expect(handle(input, lifecycle)).rejects.toThrow(
            'Issue acme/hub-mason-portal#7 not found',
        );

        expect(
            lifecycle.steps.find(({ id }) => id === PROVISION_STEP),
        ).toMatchObject({
            status: 'failed',
            details: [],
            error: expect.objectContaining({
                message: 'Issue acme/hub-mason-portal#7 not found',
            }),
        });
    });

    it('should mark the step failed when the repository exists', async () => {
        vi.mocked(planRepository).mockRejectedValue(
            new ValidationError(
                'Repository acme/identity-service already exists',
            ),
        );
        const input = createInput();
        const lifecycle = createLifecycle(input.dispatch);

        await expect(handle(input, lifecycle)).rejects.toThrow(
            'Repository acme/identity-service already exists',
        );

        expect(
            lifecycle.steps.find(({ id }) => id === PROVISION_STEP),
        ).toMatchObject({
            status: 'failed',
            details: [],
            error: expect.objectContaining({
                message: 'Repository acme/identity-service already exists',
            }),
        });
    });
});
