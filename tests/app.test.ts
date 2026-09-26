import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { routeRequest } from '@/src/router';

import { createWorkflowContext } from './fixtures/workflow-dispatch';

const processExitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as never);

vi.mock('@/src/router', () => ({
    routeRequest: vi.fn(),
}));

describe('app', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        WorkflowContext.reset();
        vi.unstubAllEnvs();
        createWorkflowContext();
        vi.mocked(routeRequest).mockResolvedValue(undefined);
    });

    it('should init the workflow context and route the dispatched request', async () => {
        await import('@/src/app');

        await vi.waitFor(() => {
            expect(WorkflowContext.getInstance().run.runId).toBe(123);
        });

        expect(routeRequest).toHaveBeenCalled();
        expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('should exit with a failure when the run cannot be started', async () => {
        const error = new Error('Missing required environment variables');
        vi.mocked(routeRequest).mockRejectedValue(error);

        await import('@/src/app');

        await vi.waitFor(() => {
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        expect(logger.error).toHaveBeenCalledWith(
            { err: error },
            'Workflow run failed before the request lifecycle could start',
        );
    });
});
