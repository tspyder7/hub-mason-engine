import { renderProvisionSummary } from '@/src/handlers/repository/provision-repository/summary';

import type {
    RepositoryOutputs,
    RepositoryPlan,
} from '@/src/handlers/repository/provision-repository/type';

const plan = (overrides: Partial<RepositoryPlan> = {}): RepositoryPlan => ({
    repository: 'acme/identity-service',
    visibility: 'private',
    topics: ['go', 'grpc'],
    description: 'Hosts the identity service',
    planFile: '/workflow/tfplan',
    ...overrides,
});

const outputs: RepositoryOutputs = {
    repoId: '42',
    repoName: 'identity-service',
    repoHttpCloneUrl: 'https://github.com/acme/identity-service.git',
    repoSshCloneUrl: 'git@github.com:acme/identity-service.git',
    repoDefaultBranch: 'main',
};

describe('renderProvisionSummary', () => {
    it('should render the plan and the outputs as readable Markdown', () => {
        const body = renderProvisionSummary(plan(), outputs);

        expect(body).toContain('### Provisioned repository');
        expect(body).toContain(
            '- **Repository:** [acme/identity-service](https://github.com/acme/identity-service)',
        );
        expect(body).toContain('- **Visibility:** private');
        expect(body).toContain('- **Description:** Hosts the identity service');
        expect(body).toContain('- **Topics:** go, grpc');
        expect(body).toContain('- **Default branch:** main');
        expect(body).toContain('- **Repository ID:** 42');
        expect(body).toContain(
            '- **Clone (HTTPS):** https://github.com/acme/identity-service.git',
        );
        expect(body).toContain(
            '- **Clone (SSH):** git@github.com:acme/identity-service.git',
        );
        expect(body).not.toContain('{');
    });

    it('should report empty topics as none', () => {
        const body = renderProvisionSummary(plan({ topics: [] }), outputs);

        expect(body).toContain('- **Topics:** none');
    });
});
