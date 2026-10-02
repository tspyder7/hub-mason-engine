import { execFile } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';

import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { createOpenTofuDriver, OpenTofuError } from '@/src/iac/opentofu/driver';
import { IaCError } from '@/src/iac/types';

import type { IaCStackConfig, IaCVars } from '@/src/iac/types';

vi.mock('node:child_process', () => ({
    execFile: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
    unlink: vi.fn(),
    writeFile: vi.fn(),
}));

type ExecCallback = (
    error: Error | null,
    stdout: string,
    stderr: string,
) => void;

const TOKEN = 'app-token';
const TOKEN_ENV_VAR = 'HUB_MASON_TOP_SECRET_TOKEN';
const MODULE_DIR = '/tmp/test-stack';

const stubExecFile = (run: (callback: ExecCallback) => void): void => {
    vi.mocked(execFile).mockImplementation(((
        _file: string,
        _args: readonly string[],
        _options: unknown,
        callback: ExecCallback,
    ) => run(callback)) as never as typeof execFile);
};

const execSucceeds = (stdout = '', stderr = ''): void => {
    stubExecFile((callback) => callback(null, stdout, stderr));
};

const execFails = (error: Error, stderr = ''): void => {
    stubExecFile((callback) => callback(error, '', stderr));
};

const createVars = (overrides: Partial<IaCVars> = {}): IaCVars => ({
    github_owner: 'acme',
    repo_name: 'identity-service',
    repo_description: 'Hosts the identity service',
    repo_visibility: 'private',
    repo_topics: ['go', 'grpc'],
    ...overrides,
});

const createDriver = (
    overrides: Partial<IaCStackConfig> = {},
): ReturnType<typeof createOpenTofuDriver> =>
    createOpenTofuDriver({
        moduleDir: MODULE_DIR,
        varsFileName: 'provision-request.tfvars.json',
        planFileName: 'tfplan',
        tokenEnvVar: TOKEN_ENV_VAR,
        ...overrides,
    });

const expectTofuEnv = (): void => {
    expect(execFile).toHaveBeenCalledWith(
        'tofu',
        expect.any(Array),
        expect.objectContaining({
            cwd: MODULE_DIR,
            encoding: 'utf8',
            env: expect.objectContaining({
                GITHUB_TOKEN: TOKEN,
                TF_IN_AUTOMATION: '1',
            }),
        }),
        expect.any(Function),
    );
};

describe('createOpenTofuDriver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv(TOKEN_ENV_VAR, TOKEN);
        execSucceeds();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('configuration', () => {
        it('should resolve vars and plan files inside the stack directory', () => {
            const driver = createDriver();

            expect(driver.moduleDir).toBe(MODULE_DIR);
            expect(driver.varsFile).toBe(
                `${MODULE_DIR}/provision-request.tfvars.json`,
            );
            expect(driver.planFile).toBe(`${MODULE_DIR}/tfplan`);
        });

        it('should fall back to default file names when none are given', () => {
            const driver = createOpenTofuDriver({
                moduleDir: MODULE_DIR,
                tokenEnvVar: TOKEN_ENV_VAR,
            });

            expect(driver.varsFile).toBe(`${MODULE_DIR}/vars.tfvars.json`);
            expect(driver.planFile).toBe(`${MODULE_DIR}/tfplan`);
        });

        it('should export the token under a custom target variable', async () => {
            const driver = createOpenTofuDriver({
                moduleDir: MODULE_DIR,
                tokenEnvVar: TOKEN_ENV_VAR,
                tokenTargetEnvVar: 'CUSTOM_TOKEN',
            });

            await driver.init();

            expect(execFile).toHaveBeenCalledWith(
                'tofu',
                expect.any(Array),
                expect.objectContaining({
                    env: expect.objectContaining({ CUSTOM_TOKEN: TOKEN }),
                }),
                expect.any(Function),
            );
        });
    });

    describe('writeVars', () => {
        it('should write the variables as a JSON variable file', async () => {
            const driver = createDriver();
            const vars = createVars();

            await driver.writeVars(vars);

            expect(writeFile).toHaveBeenCalledWith(
                expect.stringContaining('provision-request.tfvars.json'),
                `${JSON.stringify(vars, null, 2)}\n`,
                'utf8',
            );
        });
    });

    describe('init', () => {
        it('should initialize the stack non-interactively with the top secret token', async () => {
            const driver = createDriver();

            await driver.init();

            expect(execFile).toHaveBeenCalledWith(
                'tofu',
                ['init', '-input=false', '-no-color'],
                expect.objectContaining({
                    cwd: MODULE_DIR,
                    env: expect.objectContaining({ GITHUB_TOKEN: TOKEN }),
                }),
                expect.any(Function),
            );
            expectTofuEnv();
        });

        it('should reject when the top secret token is missing', async () => {
            const driver = createDriver();

            vi.stubEnv(TOKEN_ENV_VAR, '');

            await expect(driver.init()).rejects.toThrow(ValidationError);
            await expect(driver.init()).rejects.toThrow(
                'Missing required environment variable: HUB_MASON_TOP_SECRET_TOKEN',
            );
            expect(execFile).not.toHaveBeenCalled();
        });
    });

    describe('plan', () => {
        it('should plan from the written variables and return the plan file', async () => {
            const driver = createDriver();
            const planFile = await driver.plan();

            expect(execFile).toHaveBeenCalledWith(
                'tofu',
                [
                    'plan',
                    '-input=false',
                    '-no-color',
                    '-var-file',
                    expect.stringContaining('provision-request.tfvars.json'),
                    '-out',
                    expect.stringContaining('tfplan'),
                ],
                expect.anything(),
                expect.any(Function),
            );
            expect(planFile).toMatch(/tfplan$/);
        });

        it('should report the OpenTofu error details on failure', async () => {
            const driver = createDriver();

            execFails(new Error('Command failed'), '  plan exploded  ');

            await expect(driver.plan()).rejects.toThrow(OpenTofuError);
            await expect(driver.plan()).rejects.toThrow(
                'tofu plan failed: plan exploded',
            );
        });

        it('should redact tokens echoed back by tofu', async () => {
            const driver = createDriver();

            execFails(
                new Error('Command failed'),
                `error: https://${TOKEN}@github.com/acme/repo not found`,
            );

            await expect(driver.plan()).rejects.toThrow(
                'https://[REDACTED]@github.com',
            );
            expect(
                JSON.stringify(vi.mocked(logger.error).mock.calls),
            ).not.toContain(TOKEN);
        });

        it('should fall back to the process error when OpenTofu printed nothing', async () => {
            const driver = createDriver();

            execFails(new Error('spawn tofu ENOENT'));

            await expect(driver.plan()).rejects.toThrow(
                'tofu plan failed: spawn tofu ENOENT',
            );
        });

        it('should expose OpenTofu failures as IaC failures', async () => {
            const driver = createDriver();

            execFails(new Error('Command failed'), 'boom');

            await expect(driver.plan()).rejects.toBeInstanceOf(IaCError);
        });
    });

    describe('apply', () => {
        it('should apply the saved plan file', async () => {
            const driver = createDriver();

            await driver.apply('/tmp/run/tfplan');

            expect(execFile).toHaveBeenCalledWith(
                'tofu',
                ['apply', '-input=false', '-no-color', '/tmp/run/tfplan'],
                expect.anything(),
                expect.any(Function),
            );
        });
    });

    describe('output', () => {
        it('should return the raw JSON output', async () => {
            const driver = createDriver();

            execSucceeds('{"repo_name":{"value":"identity-service"}}');

            await expect(driver.output()).resolves.toBe(
                '{"repo_name":{"value":"identity-service"}}',
            );
            expect(execFile).toHaveBeenCalledWith(
                'tofu',
                ['output', '-json'],
                expect.anything(),
                expect.any(Function),
            );
        });
    });

    describe('cleanup', () => {
        it('should remove the state, plan and variable files when present', async () => {
            const driver = createDriver();

            vi.mocked(unlink).mockResolvedValue(undefined);

            await driver.cleanup();

            const removed = vi.mocked(unlink).mock.calls.map(([file]) => file);

            expect(removed).toEqual([
                expect.stringContaining('terraform.tfstate'),
                expect.stringContaining('terraform.tfstate.backup'),
                expect.stringContaining('tfplan'),
                expect.stringContaining('provision-request.tfvars.json'),
            ]);
            expect(logger.info).toHaveBeenCalledWith(
                'Removed terraform.tfstate',
            );
        });

        it('should ignore artifacts that are already gone', async () => {
            const driver = createDriver();

            vi.mocked(unlink).mockRejectedValue(
                Object.assign(new Error('no such file'), { code: 'ENOENT' }),
            );

            await expect(driver.cleanup()).resolves.toBeUndefined();
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('should attempt all artifacts then throw when removal fails', async () => {
            const driver = createDriver();

            vi.mocked(unlink)
                .mockRejectedValueOnce(
                    Object.assign(new Error('permission denied'), {
                        code: 'EACCES',
                    }),
                )
                .mockResolvedValue(undefined);

            const error = await driver.cleanup().catch((err: unknown) => err);

            expect(error).toBeInstanceOf(OpenTofuError);
            expect((error as Error).message).toContain(
                'Failed to remove terraform.tfstate',
            );
            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: expect.objectContaining({
                        message: expect.any(String),
                    }),
                },
                'Failed to remove terraform.tfstate',
            );
            expect(vi.mocked(unlink)).toHaveBeenCalledTimes(4);
        });
    });
});
