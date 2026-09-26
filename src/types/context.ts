import type { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';

import type { HandlerInput } from './dispatch';

/**
 * Contract every request handler under `src/handlers/<request type>` exposes
 * to the workflow router.
 *
 * The handler only runs the request work. Dispatch validation and lifecycle
 * resumption live in `request-validator.ts` and `lifecycle.ts` next to it and
 * are imported directly by the router.
 */
export type RequestHandler = {
    /** Runs the request type specific steps. */
    handle: (
        input: HandlerInput,
        lifecycle: LifecycleManager<string>,
    ) => Promise<void>;
};
