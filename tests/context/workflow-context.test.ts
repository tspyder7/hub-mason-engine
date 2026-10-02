import { WorkflowContext } from '@/src/context/workflow-context';

import {
    createContext,
    createWorkflowContext,
    WORKFLOW_OWNER,
    WORKFLOW_REPO,
    PORTAL,
    RUN_ID,
} from '../fixtures/workflow-dispatch';

describe('workflow-context', () => {
    afterEach(() => {
        WorkflowContext.reset();
        vi.unstubAllEnvs();
    });

    it('should return the same instance on every call', () => {
        createWorkflowContext();

        expect(WorkflowContext.getInstance()).toBe(
            WorkflowContext.getInstance(),
        );
    });

    it('should read the run and the inputs from the workflow environment', () => {
        const workflow = createWorkflowContext();

        expect(workflow.run).toEqual({
            runId: Number(RUN_ID),
            runUrl: `https://github.com/${WORKFLOW_OWNER}/${WORKFLOW_REPO}/actions/runs/${RUN_ID}`,
            owner: WORKFLOW_OWNER,
            repo: WORKFLOW_REPO,
            attempt: 1,
        });
        expect(JSON.parse(workflow.inputs.context)).toMatchObject({
            requestId: 'R-1',
        });
    });

    it('should start without a dispatch, status comment or run error', () => {
        const workflow = createWorkflowContext();

        expect(workflow.dispatch).toBeNull();
        expect(workflow.statusCommentId).toBeNull();
        expect(workflow.runError).toBeNull();
        expect(workflow.summaryDetails).toBeNull();
        expect(workflow.portal).toBeNull();
        expect(workflow.stepEmoji).toEqual({});
    });

    it('should adopt the portal locator and status comment of a verified dispatch', () => {
        const workflow = createWorkflowContext();
        const dispatch = createContext();

        workflow.setDispatch(dispatch);

        expect(workflow.dispatch).toBe(dispatch);
        expect(workflow.portal).toEqual(PORTAL);
        expect(workflow.statusCommentId).toBe(42);
        expect(workflow.stepEmoji).toEqual(
            dispatch.lifecycleSnapshot.config.emoji,
        );
    });

    it('should record the status comment, the run error and the summary details', () => {
        const workflow = createWorkflowContext();

        workflow.setDispatch(createContext());
        workflow.setStatusCommentId(99);
        workflow.setRunError({ message: 'boom' });
        workflow.setSummaryDetails('- **Repository:** acme/identity-service');

        expect(workflow.statusCommentId).toBe(99);
        expect(workflow.runError).toEqual({ message: 'boom' });
        expect(workflow.summaryDetails).toBe(
            '- **Repository:** acme/identity-service',
        );
    });

    it('should use no emoji when the snapshot has none', () => {
        const workflow = createWorkflowContext();
        const dispatch = createContext();

        workflow.setDispatch({
            ...dispatch,
            lifecycleSnapshot: {
                ...dispatch.lifecycleSnapshot,
                config: {
                    ...dispatch.lifecycleSnapshot.config,
                    emoji: undefined,
                },
            },
        });

        expect(workflow.stepEmoji).toEqual({});
    });
});
