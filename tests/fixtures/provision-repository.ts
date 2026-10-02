import { WORKFLOW_OWNER } from './workflow-dispatch';

import type {
    RepositoryOutputs,
    RepositoryPlan,
} from '@/src/handlers/repository/provision-repository/type';

export const PLAN_FILE = '/workflow/tfplan';

export const createPlan = (
    overrides: Partial<RepositoryPlan> = {},
): RepositoryPlan => ({
    repository: `${WORKFLOW_OWNER}/identity-service`,
    visibility: 'private',
    topics: ['go', 'grpc'],
    description: 'Hosts the identity service',
    planFile: PLAN_FILE,
    ...overrides,
});

export const createOutputs = (
    overrides: Partial<RepositoryOutputs> = {},
): RepositoryOutputs => ({
    repoId: '42',
    repoName: 'identity-service',
    repoHttpCloneUrl: 'https://github.com/acme/identity-service.git',
    repoSshCloneUrl: 'git@github.com:acme/identity-service.git',
    repoDefaultBranch: 'main',
    ...overrides,
});
