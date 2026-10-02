import { WorkflowContext } from '@/src/context/workflow-context';
import { createLifecycle } from '@/src/handlers/repository/provision-repository/lifecycle';

import {
    createDispatch,
    resetWorkflow,
} from '../../../fixtures/workflow-dispatch';
import { onTransitionMock } from '../../../fixtures/mocks';

vi.mock('hub-mason-core/adapters/github/comment-reporter', async () =>
    (await import('../../../fixtures/mocks')).commentReporterMockModule(),
);

describe('provision-repository lifecycle', () => {
    beforeEach(() => {
        resetWorkflow();
        onTransitionMock.mockResolvedValue(undefined);
    });

    afterEach(() => {
        WorkflowContext.reset();
    });

    it('should resume the portal snapshot as dispatched', () => {
        const dispatch = createDispatch();
        const lifecycle = createLifecycle(dispatch);

        expect(
            lifecycle.steps.map(({ id, status }) => ({ id, status })),
        ).toEqual([
            { id: 'verify-issue', status: 'completed' },
            {
                id: 'provision-repository-request-checks',
                status: 'completed',
            },
            { id: 'provision-repository', status: 'in-progress' },
        ]);
        expect(lifecycle.getDefinitions()).toEqual(
            dispatch.lifecycleSnapshot.definitions,
        );
        expect(lifecycle.getConfig()).toEqual(
            dispatch.lifecycleSnapshot.config,
        );
    });

    it('should report transitions through the portal comment reporter', async () => {
        const lifecycle = createLifecycle(createDispatch());

        await lifecycle.transition('provision-repository', 'completed');

        expect(onTransitionMock).toHaveBeenCalled();
    });

    it('should run the step the portal left in flight to completion', async () => {
        const lifecycle = createLifecycle(createDispatch());

        const result = await lifecycle.run(
            'provision-repository',
            async () => 'done',
        );

        expect(result).toBe('done');
        expect(
            lifecycle.steps.find(({ id }) => id === 'provision-repository'),
        ).toMatchObject({ status: 'completed' });
    });

    it('should mark the step failed when its work throws', async () => {
        const lifecycle = createLifecycle(createDispatch());

        await expect(
            lifecycle.run('provision-repository', async () => {
                throw new Error('boom');
            }),
        ).rejects.toThrow('boom');

        expect(
            lifecycle.steps.find(({ id }) => id === 'provision-repository'),
        ).toMatchObject({
            status: 'failed',
            error: expect.objectContaining({ message: 'boom' }),
        });
    });

    it('should reject a snapshot whose steps are not part of its config', () => {
        const dispatch = createDispatch();
        const { steps } = dispatch.lifecycleSnapshot;

        expect(() =>
            createLifecycle({
                ...dispatch,
                lifecycleSnapshot: {
                    ...dispatch.lifecycleSnapshot,
                    steps: steps.map((step) =>
                        step.id === 'provision-repository'
                            ? {
                                  ...step,
                                  status: 'archived',
                              }
                            : step,
                    ),
                },
            }),
        ).toThrow(/archived/);
    });
});
