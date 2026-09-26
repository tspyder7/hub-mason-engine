import {
    getWorkflowInputs,
    getWorkflowRun,
} from '@/src/config/workflow-config';

import type { StepError } from 'hub-mason-core/lifecycle/core/types';
import type { WorkflowRun } from '@/src/config/workflow-config';
import type {
    WorkflowDispatch,
    WorkflowInputs,
    PortalInfo,
} from '@/src/types/dispatch';

/**
 * Run scoped state shared by the workflow router, workflow adapters and
 * request type handlers.
 *
 * The dispatch is only set once the handoff signature has been verified:
 * nothing may comment on, or close, a portal issue before that happens.
 */
export class WorkflowContext {
    private static instance: WorkflowContext | undefined;

    readonly run: WorkflowRun;
    readonly inputs: WorkflowInputs;

    private _dispatch: WorkflowDispatch | null = null;
    private _statusCommentId: number | null = null;
    private _runError: StepError | null = null;

    private constructor() {
        this.run = getWorkflowRun();
        this.inputs = getWorkflowInputs();
    }

    static getInstance(): WorkflowContext {
        if (WorkflowContext.instance) return WorkflowContext.instance;

        WorkflowContext.instance = new WorkflowContext();

        return WorkflowContext.instance;
    }

    static reset(): void {
        WorkflowContext.instance = undefined;
    }

    get dispatch(): WorkflowDispatch | null {
        return this._dispatch;
    }

    get statusCommentId(): number | null {
        return this._statusCommentId;
    }

    get runError(): StepError | null {
        return this._runError;
    }

    get portal(): PortalInfo | null {
        return this._dispatch?.portal ?? null;
    }

    get stepEmoji(): Partial<Record<string, string>> {
        return this._dispatch?.lifecycleSnapshot.config.emoji ?? {};
    }

    setDispatch(dispatch: WorkflowDispatch): void {
        this._dispatch = dispatch;
        this._statusCommentId = dispatch.portal.statusCommentId;
    }

    setStatusCommentId(commentId: number): void {
        this._statusCommentId = commentId;
    }

    setRunError(error: StepError): void {
        this._runError = error;
    }
}
