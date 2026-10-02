import { execFile } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { IaCError } from '../types';
import { redactSecrets } from '../../utils/redact-secrets';
import {
    MAX_BUFFER,
    OPENTOFU_BINARY,
    OPENTOFU_COMMAND,
    OPENTOFU_ENCODING,
    OPENTOFU_ENV,
    OPENTOFU_FLAG,
} from './constants';
import {
    resolveOpenTofuArtifacts,
    resolveOpenTofuFiles,
    resolveTokenTarget,
} from './utils';

import type { IaCDriver, IaCRunResult, IaCVars } from '../types';
import type { OpenTofuDriverConfig } from './types';

/**
 * Raised when an OpenTofu command exits unsuccessfully.
 */
export class OpenTofuError extends IaCError {
    constructor(message: string) {
        super(message);
        this.name = 'OpenTofuError';
    }
}

/**
 * Creates an OpenTofu-backed driver for any stack directory.
 *
 * The provider reads its token from the environment, so the configured token
 * is handed over under its target name; the token itself is never logged.
 *
 * @param config - Stack directory, file names and token env var names.
 * @returns Driver running `tofu` inside the stack directory.
 */
export const createOpenTofuDriver = (
    config: OpenTofuDriverConfig,
): IaCDriver => {
    const { varsFile, planFile } = resolveOpenTofuFiles(config);
    const tokenTarget = resolveTokenTarget(config);
    const artifacts = resolveOpenTofuArtifacts(config, {
        varsFile,
        planFile,
    });

    const runTofu = (
        args: readonly [string, ...string[]],
    ): Promise<IaCRunResult> =>
        new Promise((resolve, reject) => {
            const token = process.env[config.tokenEnvVar];

            if (!token) {
                reject(
                    new ValidationError(
                        `Missing required environment variable: ${config.tokenEnvVar}`,
                    ),
                );
                return;
            }

            logger.info(`Running tofu ${args.join(' ')}`);

            execFile(
                OPENTOFU_BINARY,
                [...args],
                {
                    cwd: config.moduleDir,
                    encoding: OPENTOFU_ENCODING,
                    maxBuffer: MAX_BUFFER,
                    env: {
                        ...process.env,
                        [tokenTarget]: token,
                        [OPENTOFU_ENV.AUTOMATION]:
                            OPENTOFU_ENV.AUTOMATION_VALUE,
                    },
                },
                (error, stdout, stderr) => {
                    if (error) {
                        // Tofu prints remote URLs that can embed the token
                        // (`https://<token>@...`); the detail also reaches the
                        // portal comment via runError, so redact before use.
                        const detail = redactSecrets(
                            stderr.trim() === ''
                                ? error.message
                                : stderr.trim(),
                        );

                        logger.error({ err: error }, `tofu ${args[0]} failed`);

                        reject(
                            new OpenTofuError(
                                `tofu ${args[0]} failed: ${detail}`,
                            ),
                        );
                        return;
                    }

                    resolve({ stdout, stderr });
                },
            );
        });

    const writeVars = async (vars: IaCVars): Promise<void> => {
        await writeFile(
            varsFile,
            `${JSON.stringify(vars, null, 2)}\n`,
            OPENTOFU_ENCODING,
        );

        logger.info(`Wrote OpenTofu variables to ${path.basename(varsFile)}`);
    };

    const init = async (): Promise<void> => {
        await runTofu([
            OPENTOFU_COMMAND.INIT,
            OPENTOFU_FLAG.INPUT_FALSE,
            OPENTOFU_FLAG.NO_COLOR,
        ]);

        logger.info('OpenTofu initialized');
    };

    const plan = async (): Promise<string> => {
        await runTofu([
            OPENTOFU_COMMAND.PLAN,
            OPENTOFU_FLAG.INPUT_FALSE,
            OPENTOFU_FLAG.NO_COLOR,
            OPENTOFU_FLAG.VAR_FILE,
            varsFile,
            OPENTOFU_FLAG.OUT,
            planFile,
        ]);

        logger.info('OpenTofu plan saved');

        return planFile;
    };

    const apply = async (planFileToApply: string): Promise<void> => {
        await runTofu([
            OPENTOFU_COMMAND.APPLY,
            OPENTOFU_FLAG.INPUT_FALSE,
            OPENTOFU_FLAG.NO_COLOR,
            planFileToApply,
        ]);

        logger.info('OpenTofu plan applied');
    };

    const output = async (): Promise<string> => {
        const { stdout } = await runTofu([
            OPENTOFU_COMMAND.OUTPUT,
            OPENTOFU_FLAG.JSON,
        ]);

        return stdout;
    };

    const cleanup = async (): Promise<void> => {
        for (const file of artifacts) {
            try {
                await unlink(file);

                logger.info(`Removed ${path.basename(file)}`);
            } catch (error) {
                const missing =
                    (error as NodeJS.ErrnoException).code === 'ENOENT';

                if (missing) {
                    logger.debug(`${path.basename(file)} was not present`);
                } else {
                    logger.error(
                        { err: error },
                        `Failed to remove ${path.basename(file)}`,
                    );
                }
            }
        }
    };

    return {
        moduleDir: config.moduleDir,
        varsFile,
        planFile,
        writeVars,
        init,
        plan,
        apply,
        output,
        cleanup,
    };
};
