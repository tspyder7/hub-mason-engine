import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { parseDispatchContext } from 'hub-mason-core/lifecycle/core/snapshot';
import { logger } from 'hub-mason-core/utils/logger';

import { GithubClient } from 'hub-mason-core/github/client';

import { RequestType, RequestValidatorMessages } from '@/src/utils/constants';
import { asNotFound } from '@/src/utils/github-errors';
import { parseJson } from '@/src/utils/parse-json';
import { getWorkflowSecretKey } from '@/src/workflow/workflow-secret';
import { signedContextSchema } from './schemas/dispatch-context.schema';
import { dispatchedRequestSchema } from './schemas/provision-request.schema';
import { issueRequestSchema } from './schemas/legacy-issue-request.schema';

import type {
    WorkflowDispatch,
    WorkflowInputs,
    PortalInfo,
} from '@/src/types/dispatch';
import type {
    IssueRequest,
    PortalIssueSummary,
    ProvisionRepositoryHandlerInput,
    ProvisionRepositoryWorkflowRequest,
} from './type';

/**
 * Mirrors the portal request mapping so both dispatched shapes describe the
 * same repository. An unknown visibility fails closed to private.
 *
 * @param request - Raw issue form request.
 * @returns The workflow provisioning request.
 */
const fromIssueRequest = (
    request: IssueRequest,
): ProvisionRepositoryWorkflowRequest => ({
    name: request.name,
    description: request.description,
    isPublic: request.visibility[0] === 'public',
    topics: (request.topics ?? '')
        .split(' ')
        .map((topic) => topic.trim())
        .filter((topic) => topic !== ''),
});

const hasKey = (payload: unknown, key: string): boolean =>
    typeof payload === 'object' && payload !== null && key in payload;

const failWith = (message: string): never => {
    logger.error(message);

    throw new ValidationError(message);
};

/**
 * The payload is not covered by the dispatch signature, so it is validated
 * against strict schemas that drop unknown fields. Both the workflow contract
 * and the legacy issue form are accepted and normalised to the workflow
 * contract.
 *
 * @param payload - Raw decoded dispatch request.
 * @returns The validated provisioning request.
 * @throws ValidationError when the payload matches neither schema.
 */
export const parseRequestPayload = (
    payload: unknown,
): ProvisionRepositoryWorkflowRequest => {
    const dispatched = dispatchedRequestSchema.safeParse(payload);

    if (dispatched.success) {
        return dispatched.data;
    }

    const fromIssue = issueRequestSchema.safeParse(payload);

    if (fromIssue.success) {
        logger.warn(
            `${RequestValidatorMessages.DEPRECATED_PAYLOAD}: ${RequestValidatorMessages.DEPRECATED_PAYLOAD_HINT}`,
        );

        return fromIssueRequest(fromIssue.data);
    }

    const issue = hasKey(payload, 'visibility')
        ? fromIssue.error.issues[0]!.message
        : dispatched.error.issues[0]!.message;

    return failWith(`${RequestValidatorMessages.INVALID_REQUEST}: ${issue}`);
};

/**
 * The core context schema strips unknown keys and the signature covers only
 * the request id and issue time, so portal details are read and shape-checked
 * from the raw payload before the workflow acts on them.
 *
 * @param context - Raw JSON encoded dispatch context.
 * @returns The portal issue coordinates to report back to.
 * @throws ValidationError when the context carries no usable portal details.
 */
const readPortalInfo = (context: string): PortalInfo => {
    const parsed = signedContextSchema.safeParse(parseJson(context, 'context'));

    if (!parsed.success) {
        return failWith(
            `Invalid dispatch context: ${parsed.error.issues[0]!.message}`,
        );
    }

    return parsed.data.portal;
};

/**
 * Verifies the handoff signature, its freshness and the request id consistency,
 * then validates the payload and the portal details it must report back to.
 *
 * @param inputs - Raw request and context inputs of the workflow.
 * @returns The verified dispatch together with the provisioning request.
 * @throws When the signature is missing, invalid or expired, or the request type is wrong.
 */
export const validate = (
    inputs: WorkflowInputs,
): ProvisionRepositoryHandlerInput => {
    const secret = getWorkflowSecretKey();

    const ctx = parseDispatchContext<string>({ inputs, secret });

    if (ctx.requestType !== RequestType.PROVISION_REPOSITORY) {
        logger.error(RequestValidatorMessages.UNEXPECTED_REQUEST_TYPE);

        throw new ValidationError(
            RequestValidatorMessages.UNEXPECTED_REQUEST_TYPE,
        );
    }

    const dispatch: WorkflowDispatch = {
        ...ctx,
        portal: readPortalInfo(inputs.context),
    };

    const request = parseRequestPayload(parseJson(inputs.request, 'request'));

    logger.info(
        `Verified dispatch ${dispatch.requestId} of type ${dispatch.requestType} issued at ${dispatch.issuedAt}`,
    );

    return { dispatch, request };
};

/**
 * The workflow reports exclusively through the portal issue and its status
 * comment, so a missing one fails the request before any privileged work runs.
 *
 * @param portal - Portal repository issue coordinates.
 * @returns Summary of the verified issue.
 * @throws ValidationError when the issue or the status comment is missing.
 */
export const verifyPortalIssue = async (
    portal: PortalInfo,
): Promise<PortalIssueSummary> => {
    const client = GithubClient.getInstance();
    const { owner, repo, issueNumber, statusCommentId } = portal;
    const issue = `${owner}/${repo}#${issueNumber}`;

    logger.info(`Verifying portal issue ${issue}`);

    const details = await client.rest.issues
        .get({ owner, repo, issue_number: issueNumber })
        .catch((error: unknown) => asNotFound(`Issue ${issue}`, error));

    if (statusCommentId) {
        await client.rest.issues
            .getComment({ owner, repo, comment_id: statusCommentId })
            .catch((error: unknown) =>
                asNotFound(
                    `Status comment ${statusCommentId} on ${issue}`,
                    error,
                ),
            );
    }

    logger.info(`Verified portal issue ${issue}`);

    return {
        number: details.data.number,
        title: details.data.title,
        state: details.data.state,
        locked: details.data.locked ?? false,
        commentId: statusCommentId,
    };
};
