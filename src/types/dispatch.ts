import type { RequestContext } from 'hub-mason-core/types/request-context';

/**
 * Details of the portal repository issue that originated the request.
 * Carried inside the dispatch context by hub-mason-portal.
 */
export type PortalInfo = {
    owner: string;
    repo: string;
    issueNumber: number;
    statusCommentId: number | null;
};

/**
 * A dispatch context whose signature has been verified by the workflow.
 *
 * The lifecycle snapshot inside carries the statuses, emoji, steps and
 * config the workflow works with.
 */
export type WorkflowDispatch = RequestContext<string> & {
    portal: PortalInfo;
};

/**
 * Raw `workflow_dispatch` inputs as handed over by the workflow.
 */
export type WorkflowInputs = {
    request: string;
    context: string;
};

export type HandlerInput = {
    dispatch: WorkflowDispatch;
    request: unknown;
};
