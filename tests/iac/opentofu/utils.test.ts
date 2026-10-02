import {
    DEFAULT_PLAN_FILE_NAME,
    DEFAULT_VARS_FILE_NAME,
    OPENTOFU_ENV,
} from '@/src/iac/opentofu/constants';
import {
    resolveOpenTofuArtifacts,
    resolveOpenTofuFiles,
    resolveTokenTarget,
} from '@/src/iac/opentofu/utils';

const MODULE_DIR = '/tmp/test-stack';
const TOKEN_ENV_VAR = 'HUB_MASON_TOP_SECRET_TOKEN';

describe('opentofu utils', () => {
    describe('defaults', () => {
        it('should expose default file names and token target', () => {
            expect(DEFAULT_VARS_FILE_NAME).toBe('vars.tfvars.json');
            expect(DEFAULT_PLAN_FILE_NAME).toBe('tfplan');
            expect(OPENTOFU_ENV.DEFAULT_TOKEN_TARGET).toBe('GITHUB_TOKEN');
        });
    });

    describe('resolveOpenTofuFiles', () => {
        it('should resolve explicit file names inside the stack directory', () => {
            expect(
                resolveOpenTofuFiles({
                    moduleDir: MODULE_DIR,
                    varsFileName: 'custom.tfvars.json',
                    planFileName: 'custom-plan',
                    tokenEnvVar: TOKEN_ENV_VAR,
                }),
            ).toEqual({
                varsFile: `${MODULE_DIR}/custom.tfvars.json`,
                planFile: `${MODULE_DIR}/custom-plan`,
            });
        });

        it('should fall back to default file names when none are given', () => {
            expect(
                resolveOpenTofuFiles({
                    moduleDir: MODULE_DIR,
                    tokenEnvVar: TOKEN_ENV_VAR,
                }),
            ).toEqual({
                varsFile: `${MODULE_DIR}/vars.tfvars.json`,
                planFile: `${MODULE_DIR}/tfplan`,
            });
        });
    });

    describe('resolveTokenTarget', () => {
        it('should prefer the configured target variable', () => {
            expect(
                resolveTokenTarget({
                    moduleDir: MODULE_DIR,
                    tokenEnvVar: TOKEN_ENV_VAR,
                    tokenTargetEnvVar: 'CUSTOM_TOKEN',
                }),
            ).toBe('CUSTOM_TOKEN');
        });

        it('should fall back to the default token target', () => {
            expect(
                resolveTokenTarget({
                    moduleDir: MODULE_DIR,
                    tokenEnvVar: TOKEN_ENV_VAR,
                }),
            ).toBe('GITHUB_TOKEN');
        });
    });

    describe('resolveOpenTofuArtifacts', () => {
        it('should list state, plan and variable files in removal order', () => {
            expect(
                resolveOpenTofuArtifacts(
                    { moduleDir: MODULE_DIR, tokenEnvVar: TOKEN_ENV_VAR },
                    {
                        varsFile: `${MODULE_DIR}/vars.tfvars.json`,
                        planFile: `${MODULE_DIR}/tfplan`,
                    },
                ),
            ).toEqual([
                `${MODULE_DIR}/terraform.tfstate`,
                `${MODULE_DIR}/terraform.tfstate.backup`,
                `${MODULE_DIR}/tfplan`,
                `${MODULE_DIR}/vars.tfvars.json`,
            ]);
        });
    });
});
