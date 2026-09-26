import { checkRepoExists } from 'hub-mason-core/github/repository';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { planRepository } from '@/src/handlers/repository/provision-repository/provision';

import {
    createRequest,
    WORKFLOW_OWNER,
} from '../../../fixtures/workflow-dispatch';

vi.mock('hub-mason-core/github/repository', () => ({
    checkRepoExists: vi.fn(),
}));

describe('planRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(checkRepoExists).mockResolvedValue(false);
    });

    it('should log the request details and return the plan', async () => {
        const plan = await planRepository({
            request: createRequest(),
            owner: WORKFLOW_OWNER,
        });

        expect(plan).toEqual({
            repository: `${WORKFLOW_OWNER}/identity-service`,
            visibility: 'private',
            topics: ['go', 'grpc'],
            description: 'Hosts the identity service',
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Planning repository provisioning for acme/identity-service',
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Description: Hosts the identity service',
        );
        expect(logger.info).toHaveBeenCalledWith('Visibility: private');
        expect(logger.info).toHaveBeenCalledWith('Topics: go, grpc');
        expect(checkRepoExists).toHaveBeenCalledWith({
            owner: WORKFLOW_OWNER,
            repo: 'identity-service',
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Repository acme/identity-service is available for provisioning',
        );
    });

    it('should plan a public repository without topics', async () => {
        const plan = await planRepository({
            request: createRequest({ isPublic: true, topics: [] }),
            owner: WORKFLOW_OWNER,
        });

        expect(plan.visibility).toBe('public');
        expect(logger.info).toHaveBeenCalledWith('Topics: none');
    });

    it('should throw when the repository already exists', async () => {
        vi.mocked(checkRepoExists).mockResolvedValue(true);

        await expect(
            planRepository({ request: createRequest(), owner: WORKFLOW_OWNER }),
        ).rejects.toThrow(ValidationError);
        expect(logger.error).toHaveBeenCalledWith(
            'Repository acme/identity-service already exists',
        );
    });
});
