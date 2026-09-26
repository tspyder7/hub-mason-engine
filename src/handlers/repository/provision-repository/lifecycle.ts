import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';

import { createWorkflowCommentReporter } from '@/src/workflow/workflow-reporter';

import type { WorkflowDispatch } from '@/src/types/dispatch';

/**
 * Resumes the portal lifecycle for a provision repository request.
 *
 * The portal snapshot is the whole lifecycle: its config, definitions and
 * steps are taken over as dispatched, no workflow owned steps are added.
 *
 * @param dispatch - Verified dispatch carrying the portal snapshot.
 * @returns Lifecycle manager resumed from the portal snapshot.
 * @throws When the snapshot is not a valid lifecycle.
 */
export const createLifecycle = (
    dispatch: WorkflowDispatch,
): LifecycleManager<string> =>
    LifecycleManager.fromSnapshot<string>({
        snapshot: dispatch.lifecycleSnapshot,
        reporter: createWorkflowCommentReporter(),
    });
