import type { HandlerInput } from '@/src/types/dispatch';

export type RepositoryVisibility = 'public' | 'private';

/**
 * Repository provisioning details as dispatched by hub-mason-portal.
 */
export interface ProvisionRepositoryWorkflowRequest {
    name: string;
    description: string;
    isPublic: boolean;
    topics: string[];
}

/**
 * Raw issue form still dispatched by hub-mason-portal before the request
 * mapping landed.
 */
export type IssueRequest = {
    name: string;
    description: string;
    visibility: string[];
    topics?: string;
};

/**
 * Repository attributes the workflow intends to provision, derived from the
 * request until the OpenTofu plan is wired in.
 */
export type RepositoryPlan = {
    repository: string;
    visibility: RepositoryVisibility;
    topics: string[];
    description: string;
};

export type ProvisionRepositoryHandlerInput = HandlerInput & {
    request: ProvisionRepositoryWorkflowRequest;
};

export type PlanRepositoryProps = {
    request: ProvisionRepositoryWorkflowRequest;
    owner: string;
};

export type PortalIssueSummary = {
    number: number;
    title: string;
    state: string;
    locked: boolean;
    commentId: number | null;
};
