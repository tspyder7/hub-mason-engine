import { checkRepoExists } from 'hub-mason-core/github/repository';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { createIaCDriver } from '@/src/iac/factory';
import {
    applyRepository,
    planRepository,
    REPO_SYNTHESIZER_TOKEN_ENV_VAR,
} from '@/src/handlers/repository/provision-repository/provision';

import {
    createRequest,
    WORKFLOW_OWNER,
} from '../../../fixtures/workflow-dispatch';

import type {
    RepositoryOutputs,
    RepositoryPlan,
} from '@/src/handlers/repository/provision-repository/type';
import type { IaCDriver } from '@/src/iac/types';

vi.mock('hub-mason-core/github/repository', () => ({
    checkRepoExists: vi.fn(),
}));

vi.mock('@/src/iac/factory', () => ({
    createIaCDriver: vi.fn(),
}));

const PLAN_FILE = '/workflow/tfplan';

const OUTPUTS_JSON = JSON.stringify({
    repo_id: { value: 42 },
    repo_name: { value: 'identity-service' },
    repo_http_clone_url: {
        value: 'https://github.com/acme/identity-service.git',
    },
    repo_ssh_clone_url: {
        value: 'git@github.com:acme/identity-service.git',
    },
    repo_default_branch: { value: 'main' },
});

const calls: string[] = [];

let driver: IaCDriver;

const plan = (overrides: Partial<RepositoryPlan> = {}): RepositoryPlan => ({
    repository: 'acme/identity-service',
    visibility: 'private',
    topics: ['go', 'grpc'],
    description: 'Hosts the identity service',
    planFile: PLAN_FILE,
    ...overrides,
});

const outputs = (
    overrides: Partial<RepositoryOutputs> = {},
): RepositoryOutputs => ({
    repoId: '42',
    repoName: 'identity-service',
    repoHttpCloneUrl: 'https://github.com/acme/identity-service.git',
    repoSshCloneUrl: 'git@github.com:acme/identity-service.git',
    repoDefaultBranch: 'main',
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    vi.mocked(checkRepoExists).mockResolvedValue(false);
    driver = {
        moduleDir: '/workflow',
        varsFile: '/workflow/provision-request.tfvars.json',
        planFile: PLAN_FILE,
        writeVars: vi.fn(async () => {
            calls.push('vars');
        }),
        init: vi.fn(async () => {
            calls.push('init');
        }),
        plan: vi.fn(async () => {
            calls.push('plan');

            return PLAN_FILE;
        }),
        apply: vi.fn(),
        output: vi.fn(async () => OUTPUTS_JSON),
        cleanup: vi.fn(),
    };
    vi.mocked(createIaCDriver).mockReturnValue(driver);
});

describe('repository driver wiring', () => {
    it('should expose the top secret token variable', () => {
        expect(REPO_SYNTHESIZER_TOKEN_ENV_VAR).toBe(
            'HUB_MASON_TOP_SECRET_TOKEN',
        );
    });

    it('should create an OpenTofu driver for the repo-synthesizer stack', async () => {
        await planRepository({
            request: createRequest(),
            owner: WORKFLOW_OWNER,
        });

        expect(createIaCDriver).toHaveBeenCalledWith(
            'opentofu',
            expect.objectContaining({
                moduleDir: expect.stringContaining('repo-synthesizer'),
                varsFileName: 'provision-request.tfvars.json',
                planFileName: 'tfplan',
                tokenEnvVar: 'HUB_MASON_TOP_SECRET_TOKEN',
            }),
        );
    });
});

describe('planRepository', () => {
    it('should log the request details and return the plan', async () => {
        const result = await planRepository({
            request: createRequest(),
            owner: WORKFLOW_OWNER,
        });

        expect(result).toEqual({
            repository: `${WORKFLOW_OWNER}/identity-service`,
            visibility: 'private',
            topics: ['go', 'grpc'],
            description: 'Hosts the identity service',
            planFile: PLAN_FILE,
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
        expect(logger.info).toHaveBeenCalledWith(
            'IaC plan created for acme/identity-service',
        );
    });

    it('should plan a public repository without topics', async () => {
        const result = await planRepository({
            request: createRequest({ isPublic: true, topics: [] }),
            owner: WORKFLOW_OWNER,
        });

        expect(result.visibility).toBe('public');
        expect(logger.info).toHaveBeenCalledWith('Topics: none');
    });

    it('should write the request as IaC variables and plan before returning', async () => {
        await planRepository({
            request: createRequest(),
            owner: WORKFLOW_OWNER,
        });

        expect(driver.writeVars).toHaveBeenCalledWith({
            github_owner: WORKFLOW_OWNER,
            repo_name: 'identity-service',
            repo_description: 'Hosts the identity service',
            repo_visibility: 'private',
            repo_topics: ['go', 'grpc'],
        });
        expect(calls).toEqual(['vars', 'init', 'plan']);
        expect(driver.cleanup).not.toHaveBeenCalled();
    });

    it('should remove the IaC artifacts and rethrow when the plan fails', async () => {
        const failure = new Error('tofu plan failed: plan exploded');

        vi.mocked(driver.plan).mockRejectedValue(failure);

        await expect(
            planRepository({ request: createRequest(), owner: WORKFLOW_OWNER }),
        ).rejects.toThrow('tofu plan failed: plan exploded');
        expect(driver.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should throw when the repository already exists', async () => {
        vi.mocked(checkRepoExists).mockResolvedValue(true);

        await expect(
            planRepository({ request: createRequest(), owner: WORKFLOW_OWNER }),
        ).rejects.toThrow(ValidationError);
        expect(logger.error).toHaveBeenCalledWith(
            'Repository acme/identity-service already exists',
        );
        expect(driver.writeVars).not.toHaveBeenCalled();
        expect(driver.cleanup).not.toHaveBeenCalled();
    });
});

describe('applyRepository', () => {
    it('should apply the saved plan, read the outputs and delete the state', async () => {
        const result = await applyRepository({ plan: plan() });

        expect(driver.apply).toHaveBeenCalledWith(PLAN_FILE);
        expect(driver.output).toHaveBeenCalledTimes(1);
        expect(result).toEqual(outputs());
        expect(driver.cleanup).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith(
            'Provisioning acme/identity-service from /workflow/tfplan',
        );
        expect(logger.info).toHaveBeenCalledWith(
            'Provisioned acme/identity-service on branch main',
        );
    });

    it('should delete the state and rethrow when the apply fails', async () => {
        vi.mocked(driver.apply).mockRejectedValue(
            new Error('tofu apply failed: rate limited'),
        );

        await expect(applyRepository({ plan: plan() })).rejects.toThrow(
            'tofu apply failed: rate limited',
        );
        expect(driver.output).not.toHaveBeenCalled();
        expect(driver.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should delete the state and rethrow when the outputs are unusable', async () => {
        vi.mocked(driver.output).mockResolvedValue('not json');

        await expect(applyRepository({ plan: plan() })).rejects.toThrow(
            ValidationError,
        );
        await expect(applyRepository({ plan: plan() })).rejects.toThrow(
            'Invalid OpenTofu output JSON',
        );
        expect(driver.cleanup).toHaveBeenCalledTimes(2);
    });
});
