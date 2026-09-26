import { getWorkflowSecretKey } from '@/src/workflow/workflow-secret';
import { SECRET } from '../fixtures/workflow-dispatch';

describe('workflow-secret', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should return the shared handoff secret', () => {
        vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', SECRET);

        expect(getWorkflowSecretKey()).toBe(SECRET);
    });

    it('should throw when the secret is not set', () => {
        vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', '');

        expect(() => getWorkflowSecretKey()).toThrow(
            'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
        );
    });
});
