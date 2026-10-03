import { renderProvisionSummary } from '@/src/handlers/repository/provision-repository/summary';

import {
    createOutputs,
    createPlan,
} from '../../../fixtures/provision-repository';

describe('renderProvisionSummary', () => {
    it('should render the plan and the outputs as readable Markdown', () => {
        const body = renderProvisionSummary(createPlan(), createOutputs());

        expect(body).toContain('### Provisioned repository');
        expect(body).toContain(
            '- **Repository:** [acme/identity-service](https://github.com/acme/identity-service)',
        );
        expect(body).not.toContain('Visibility');
        expect(body).not.toContain('Description');
        expect(body).not.toContain('Topics');
        expect(body).toContain('- **Default branch:** main');
        expect(body).toContain('- **Repository ID:** `42`');
        expect(body).toContain(
            '- **Clone (HTTPS):** https://github.com/acme/identity-service.git',
        );
        expect(body).toContain(
            '- **Clone (SSH):** `git@github.com:acme/identity-service.git`',
        );
        expect(body).not.toContain('{');
    });

    it('should sanitize code blocks in the repository id and the ssh url', () => {
        const body = renderProvisionSummary(
            createPlan(),
            createOutputs({
                repoId: '4`2',
                repoSshCloneUrl: 'git@github.com:acme/a`b.git',
            }),
        );

        expect(body).toContain("- **Repository ID:** `4'2`");
        expect(body).toContain(
            "- **Clone (SSH):** `git@github.com:acme/a'b.git`",
        );
        expect(body).not.toContain('`2`');
    });
});
