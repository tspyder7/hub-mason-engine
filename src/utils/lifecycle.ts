import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import type { Step } from 'hub-mason-core/lifecycle/core/types';

/**
 * Finds the step the workflow must continue: the first step that is neither in
 * the initial status nor terminal.
 *
 * Statuses always come from the dispatched lifecycle config, so the workflow
 * never assumes what "in progress" or "done" are called.
 *
 * @param lifecycle - Lifecycle resumed from the portal snapshot.
 * @returns The active step, or undefined when every step is untouched or done.
 */
export const findActiveStep = (
    lifecycle: LifecycleManager<string>,
): Step<string> | undefined => {
    const { initial, terminal } = lifecycle.getConfig();
    const terminalStatuses = new Set(terminal ?? []);

    return lifecycle.steps.find(
        ({ status }) => status !== initial && !terminalStatuses.has(status),
    );
};
