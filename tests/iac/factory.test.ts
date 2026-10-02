import { createIaCDriver } from '@/src/iac/factory';
import { IaCError } from '@/src/iac/types';

describe('createIaCDriver', () => {
    describe('opentofu', () => {
        it('should return an OpenTofu driver bound to the stack', async () => {
            const driver = createIaCDriver('opentofu', {
                moduleDir: '/tmp/stacks/demo',
                tokenEnvVar: 'HUB_MASON_TOP_SECRET_TOKEN',
            });

            expect(driver.moduleDir).toBe('/tmp/stacks/demo');
            expect(driver.varsFile).toBe('/tmp/stacks/demo/vars.tfvars.json');
            expect(driver.planFile).toBe('/tmp/stacks/demo/tfplan');
        });
    });

    describe('validation', () => {
        it('should throw an IaC error for an unknown provider', () => {
            expect(() =>
                createIaCDriver('terraform' as never, {
                    moduleDir: '/tmp/stacks/demo',
                    tokenEnvVar: 'HUB_MASON_TOP_SECRET_TOKEN',
                }),
            ).toThrow(IaCError);
            expect(() =>
                createIaCDriver('terraform' as never, {
                    moduleDir: '/tmp/stacks/demo',
                    tokenEnvVar: 'HUB_MASON_TOP_SECRET_TOKEN',
                }),
            ).toThrow('Unsupported IaC provider: terraform');
        });
    });
});
