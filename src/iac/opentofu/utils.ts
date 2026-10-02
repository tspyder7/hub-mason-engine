import path from 'node:path';

import {
    DEFAULT_PLAN_FILE_NAME,
    DEFAULT_TOKEN_TARGET_ENV_VAR,
    DEFAULT_VARS_FILE_NAME,
    OPENTOFU_STATE_FILE,
} from './constants';

import type { IaCStackConfig } from '../types';
import type { OpenTofuFiles } from './types';

/**
 * Resolves the variable and plan files for a stack directory.
 *
 * @param config - Stack directory with optional file name overrides.
 * @returns Absolute variable and plan file paths.
 */
export const resolveOpenTofuFiles = (
    config: IaCStackConfig,
): OpenTofuFiles => ({
    varsFile: path.join(
        config.moduleDir,
        config.varsFileName ?? DEFAULT_VARS_FILE_NAME,
    ),
    planFile: path.join(
        config.moduleDir,
        config.planFileName ?? DEFAULT_PLAN_FILE_NAME,
    ),
});

/**
 * Resolves the target environment variable receiving the stack token.
 *
 * @param config - Stack config with an optional target override.
 * @returns Target variable name for the token.
 */
export const resolveTokenTarget = (config: IaCStackConfig): string =>
    config.tokenTargetEnvVar ?? DEFAULT_TOKEN_TARGET_ENV_VAR;

/**
 * Resolves every artifact that may hold credentials and must not
 * outlive the run: local state, the saved plan and the variable file.
 *
 * @param config - Stack directory with optional file name overrides.
 * @param files - Resolved variable and plan files.
 * @returns Absolute artifact paths in removal order.
 */
export const resolveOpenTofuArtifacts = (
    config: IaCStackConfig,
    files: OpenTofuFiles,
): string[] => [
    path.join(config.moduleDir, OPENTOFU_STATE_FILE.STATE),
    path.join(config.moduleDir, OPENTOFU_STATE_FILE.STATE_BACKUP),
    files.planFile,
    files.varsFile,
];
