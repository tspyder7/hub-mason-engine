import { createSignature } from 'hub-mason-core/lifecycle/security/sign';

import * as github from '@actions/github';

import { WorkflowContext } from '@/src/context/workflow-context';
import { RequestType } from '@/src/utils/constants';

import type { LifecycleSnapshot } from 'hub-mason-core/types/snapshot';
import type {
    WorkflowDispatch,
    WorkflowInputs,
    PortalInfo,
} from '@/src/types/dispatch';
import type { ProvisionRepositoryWorkflowRequest } from '@/src/handlers/repository/provision-repository/type';

export const SECRET = 'test-secret';
export const REQUEST_ID = 'R-1';
export const WORKFLOW_OWNER = 'acme';
export const WORKFLOW_REPO = 'hub-mason-engine';
export const RUN_ID = '123';
export const RUN_URL = `https://github.com/${WORKFLOW_OWNER}/${WORKFLOW_REPO}/actions/runs/${RUN_ID}`;

export const PORTAL: PortalInfo = {
    owner: 'acme',
    repo: 'hub-mason-portal',
    issueNumber: 7,
    statusCommentId: 42,
};

export const createRequest = (
    overrides: Partial<ProvisionRepositoryWorkflowRequest> = {},
): ProvisionRepositoryWorkflowRequest => ({
    name: 'identity-service',
    description: 'Hosts the identity service',
    isPublic: false,
    topics: ['go', 'grpc'],
    ...overrides,
});

/**
 * Mirrors the lifecycle snapshot hub-mason-portal hands over on dispatch: the
 * portal steps are done and the provisioning step is still in flight.
 */
export const createSnapshot = (): LifecycleSnapshot<string> => ({
    config: {
        statuses: [
            'pending',
            'in-progress',
            'completed',
            'cancelled',
            'failed',
        ],
        initial: 'pending',
        transitions: {
            ['pending']: ['in-progress', 'cancelled'],
            ['in-progress']: ['completed', 'failed', 'cancelled'],
            ['completed']: [],
            ['cancelled']: [],
            ['failed']: [],
        },
        terminal: ['completed', 'failed', 'cancelled'],
        emoji: {
            ['pending']: '⏳',
            ['in-progress']: '🔄',
            ['completed']: '✅',
            ['cancelled']: '🚫',
            ['failed']: '❌',
        },
        version: '1',
        labelPrefix: 'status:',
    },
    definitions: [
        { id: 'verify-issue', name: 'Verify issue' },
        {
            id: 'provision-repository-request-checks',
            name: 'Provision repository request checks',
        },
        { id: 'provision-repository', name: 'Provision repository' },
    ],
    steps: [
        {
            id: 'verify-issue',
            name: 'Verify issue',
            status: 'completed',
            completedAt: '2026-01-01T00:00:00.000Z',
            details: [],
        },
        {
            id: 'provision-repository-request-checks',
            name: 'Provision repository request checks',
            status: 'completed',
            completedAt: '2026-01-01T00:00:01.000Z',
            details: [],
        },
        {
            id: 'provision-repository',
            name: 'Provision repository',
            status: 'in-progress',
            startedAt: '2026-01-01T00:00:02.000Z',
            details: [],
        },
    ],
    meta: {
        requestId: REQUEST_ID,
        requestType: RequestType.PROVISION_REPOSITORY,
        createdAt: '2026-01-01T00:00:02.000Z',
    },
});

export const createContext = (): WorkflowDispatch => {
    const issuedAt = new Date().toISOString();

    return {
        requestId: REQUEST_ID,
        requestType: RequestType.PROVISION_REPOSITORY,
        lifecycleSnapshot: createSnapshot(),
        signature: createSignature({
            requestId: REQUEST_ID,
            issuedAt,
            secret: SECRET,
        }),
        issuedAt,
        actor: 'hub-mason-bot',
        portal: PORTAL,
    };
};

type CreateInputsProps = {
    request?: unknown;
    context?: unknown;
};

export const createInputs = ({
    request = createRequest(),
    context = createContext(),
}: CreateInputsProps = {}): WorkflowInputs => ({
    request: typeof request === 'string' ? request : JSON.stringify(request),
    context: typeof context === 'string' ? context : JSON.stringify(context),
});

/**
 * Stubs the workflow environment and returns the resulting context.
 */
export const createWorkflowContext = (
    props: CreateInputsProps = {},
): WorkflowContext => {
    const inputs = createInputs(props);

    vi.stubEnv('GITHUB_RUN_ID', RUN_ID);
    vi.stubEnv('GITHUB_REPOSITORY', `${WORKFLOW_OWNER}/${WORKFLOW_REPO}`);
    vi.stubEnv('GITHUB_SERVER_URL', 'https://github.com');
    vi.stubEnv('GITHUB_RUN_ATTEMPT', '1');
    vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', SECRET);
    github.context.payload['inputs'] = {
        request: inputs.request,
        context: inputs.context,
    };

    return WorkflowContext.getInstance();
};
