import type { HandlerInput } from '@/src/types/dispatch';

export type RepositoryVisibility = 'public' | 'private';

export interface ProvisionRepositoryWorkflowRequest {
    name: string;
    description: string;
    isPublic: boolean;
    topics: string[];
}

export type IssueRequest = {
    name: string;
    description: string;
    visibility: string[];
    topics?: string;
};

export type RepositoryPlan = {
    repository: string;
    visibility: RepositoryVisibility;
    topics: string[];
    description: string;
    planFile: string;
};

export type RepositoryOutputs = {
    repoId: string;
    repoName: string;
    repoHttpCloneUrl: string;
    repoSshCloneUrl: string;
    repoDefaultBranch: string;
};

export type ProvisionRepositoryHandlerInput = HandlerInput & {
    request: ProvisionRepositoryWorkflowRequest;
};

export type PlanRepositoryProps = {
    request: ProvisionRepositoryWorkflowRequest;
    owner: string;
};

export type ApplyRepositoryProps = {
    plan: RepositoryPlan;
};

export type PortalIssueSummary = {
    number: number;
    title: string;
    state: string;
    locked: boolean;
    commentId: number | null;
};
