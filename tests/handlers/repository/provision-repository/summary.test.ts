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
        const body = renderProvisionSummary(
            createPlan({ topics: [] }),
            createOutputs(),
        );

        expect(body).toContain('- **Topics:** none');
    });
});
