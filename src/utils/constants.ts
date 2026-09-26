export const RequestType = {
    PROVISION_REPOSITORY: 'repository/provision-repository',
} as const;

export type RequestTypeName = (typeof RequestType)[keyof typeof RequestType];

export const HandlerMessages = {
    NO_ACTIVE_STEP: 'The dispatched snapshot has no in-progress step',
} as const;

export const RequestValidatorMessages = {
    UNEXPECTED_REQUEST_TYPE: `Unexpected request type: ${RequestType.PROVISION_REPOSITORY}`,
    INVALID_REQUEST: 'Invalid provision repository request',
    DEPRECATED_PAYLOAD:
        'Request payload uses the deprecated portal shape (visibility/topics string)',
    DEPRECATED_PAYLOAD_HINT:
        'Merging the portal request mapping (isPublic and topics array) lets the workflow drop the legacy shape',
} as const;

export const RouterMessages = {
    UNVERIFIED_DISPATCH:
        'Skipping summary comment and issue closure: the dispatch was not verified',
} as const;

export const WorkflowReporterMessages = {
    UNVERIFIED_DISPATCH:
        'Skipping comment reporting: the dispatch is not verified yet',
    NO_STEPS: 'Skipping status comment: the lifecycle has no steps',
} as const;

export const WorkflowConfigMessages = {
    MISSING_RUN_ENVIRONMENT:
        'Missing required environment variables: GITHUB_RUN_ID, GITHUB_REPOSITORY',
} as const;

export const WorkflowSecretMessages = {
    MISSING_SECRET:
        'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
} as const;

export const ResolveRequestTypeMessages = {
    MISSING_CONTEXT: 'Missing context input',
} as const;
