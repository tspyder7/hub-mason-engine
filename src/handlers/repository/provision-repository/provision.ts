import { checkRepoExists } from 'hub-mason-core/github/repository';
import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';

import type {
    PlanRepositoryProps,
    RepositoryPlan,
    RepositoryVisibility,
} from './type';

/**
 * Plans the repository provisioning for a verified request.
 *
 * The OpenTofu module that owns repository creation does not exist yet, so the
 * plan is limited to the repository attributes derived from the request.
 *
 * TODO(hub-mason): invoke `tofu plan` here, for example
 * `tofu plan -var-file=<request> -out=tfplan`, and derive the plan result from
 * the plan output instead of from the request.
 *
 * @param props - Verified request and the owner to provision under.
 * @returns The repository attributes the workflow intends to provision.
 * @throws ValidationError when the repository already exists.
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

    return {
        repository,
        visibility,
        topics,
        description: request.description,
    };
};
