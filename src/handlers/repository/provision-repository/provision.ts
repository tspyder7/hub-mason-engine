import { fileURLToPath } from 'node:url';

import { checkRepoExists } from 'hub-mason-core/github/repository';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import { createIaCDriver } from '@/src/iac/factory';
import { parseRepositoryOutputs } from './outputs';

import { IaCProviderDriver, type IaCDriver } from '@/src/iac/types';
import type {
    ApplyRepositoryProps,
    PlanRepositoryProps,
    RepositoryOutputs,
    RepositoryPlan,
    RepositoryVisibility,
} from './type';

const MODULE_DIR = fileURLToPath(
    new URL('../../../../infra/github/repo-synthesizer', import.meta.url),
);

const VARS_FILE_NAME = 'provision-request.tfvars.json';
const PLAN_FILE_NAME = 'tfplan';
export const REPO_SYNTHESIZER_TOKEN_ENV_VAR = 'HUB_MASON_TOP_SECRET_TOKEN';

const createDriver = (): IaCDriver =>
    createIaCDriver(IaCProviderDriver.OPENTOFU, {
        moduleDir: MODULE_DIR,
        varsFileName: VARS_FILE_NAME,
        planFileName: PLAN_FILE_NAME,
        tokenEnvVar: REPO_SYNTHESIZER_TOKEN_ENV_VAR,
    });

/**
 * Runs stack work that must not leave credential-bearing artifacts behind:
 * local state can hold provider credentials, so any failure removes the
 * generated files before rethrowing.
 *
 * @param driver - Driver bound to the repo-synthesizer stack.
 * @param run - Stack work to attempt.
 * @returns Whatever the stack work produced.
 */
const runWithCleanupOnFailure = async <T>(
    driver: IaCDriver,
    run: () => Promise<T>,
): Promise<T> => {
    try {
        return await run();
    } catch (error) {
        await driver.cleanup();

        throw error;
    }
};

/**
 * Plans the repository provisioning for a verified request.
 *
 * After `checkRepoExists` confirms the name is free, the verified request is
 * written as a JSON variable file, the stack is initialised and a saved plan
 * is produced for the apply step.
 *
 * @param props - Verified request and the owner to provision under.
 * @returns The repository attributes and the saved plan to apply.
 * @throws ValidationError when the repository already exists.
 * @throws IaCError when init or plan fails.
 */
export const planRepository = async ({
    request,
    owner,
}: PlanRepositoryProps): Promise<RepositoryPlan> => {
    const repository = `${owner}/${request.name}`;
    const visibility: RepositoryVisibility = request.isPublic
        ? 'public'
        : 'private';
    const topics = request.topics;

    logger.info(`Planning repository provisioning for ${repository}`);
    logger.info(`Description: ${request.description}`);
    logger.info(`Visibility: ${visibility}`);
    logger.info(`Topics: ${topics.length > 0 ? topics.join(', ') : 'none'}`);

    const exists = await checkRepoExists({ owner, repo: request.name });

    if (exists) {
        logger.error(`Repository ${repository} already exists`);

        throw new ValidationError(`Repository ${repository} already exists`);
    }

    logger.info(`Repository ${repository} is available for provisioning`);

    const driver = createDriver();

    return runWithCleanupOnFailure(driver, async () => {
        await driver.writeVars({
            github_owner: owner,
            repo_name: request.name,
            repo_description: request.description,
            repo_visibility: visibility,
            repo_topics: topics,
        });
        await driver.init();
        const planFile = await driver.plan();

        logger.info(`IaC plan created for ${repository}`);

        return {
            repository,
            visibility,
            topics,
            description: request.description,
            planFile,
        };
    });
};

/**
 * Provisions the repository from a previously created plan.
 *
 * The saved plan is applied first, the stack outputs are then read as JSON
 * and the local state is removed: state can hold provider credentials and
 * must not survive the run, successful or not.
 *
 * @param props - Plan produced by `planRepository`.
 * @returns The repository facts reported back on the portal issue.
 * @throws IaCError when apply or output fails.
 * @throws ValidationError when the outputs are not the expected JSON.
 */
export const applyRepository = async ({
    plan,
}: ApplyRepositoryProps): Promise<RepositoryOutputs> => {
    logger.info(`Provisioning ${plan.repository} from ${plan.planFile}`);

    const driver = createDriver();

    return runWithCleanupOnFailure(driver, async () => {
        await driver.apply(plan.planFile);
        const outputs = parseRepositoryOutputs(await driver.output());
        await driver.cleanup();

        logger.info(
            `Provisioned ${plan.repository} on branch ${outputs.repoDefaultBranch}`,
        );

        return outputs;
    });
};
