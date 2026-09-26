import { LifecycleManager } from 'hub-mason-core/lifecycle/core/manager';
import { MemoryStore } from 'hub-mason-core/lifecycle/store/memory-store';

import { findActiveStep } from '@/src/utils/lifecycle';

import type { LifecycleConfig } from 'hub-mason-core/lifecycle/core/config';
import type { Step } from 'hub-mason-core/lifecycle/core/types';

const config: LifecycleConfig<string> = {
    statuses: ['pending', 'in-progress', 'completed', 'cancelled', 'failed'],
    initial: 'pending',
    transitions: {
        pending: ['in-progress', 'cancelled'],
        'in-progress': ['completed', 'failed', 'cancelled'],
        completed: [],
        cancelled: [],
        failed: [],
    },
    terminal: ['completed', 'failed', 'cancelled'],
};

const createManager = (
    steps: Step<string>[],
    lifecycleConfig: LifecycleConfig<string> = config,
): LifecycleManager<string> =>
    new LifecycleManager<string>({
        definitions: steps.map(({ id, name }) => ({ id, name })),
        config: lifecycleConfig,
        store: new MemoryStore<string>(steps),
    });

describe('findActiveStep', () => {
    it('should return the first step that is neither initial nor terminal', () => {
        const lifecycle = createManager([
            { id: 'one', name: 'One', status: 'completed', details: [] },
            { id: 'two', name: 'Two', status: 'in-progress', details: [] },
            { id: 'three', name: 'Three', status: 'pending', details: [] },
        ]);

        expect(findActiveStep(lifecycle)?.id).toBe('two');
    });

    it('should return undefined when every step is untouched', () => {
        const lifecycle = createManager([
            { id: 'one', name: 'One', status: 'pending', details: [] },
        ]);

        expect(findActiveStep(lifecycle)).toBeUndefined();
    });

    it('should return undefined when every step is terminal', () => {
        const lifecycle = createManager([
            { id: 'one', name: 'One', status: 'completed', details: [] },
            { id: 'two', name: 'Two', status: 'cancelled', details: [] },
        ]);

        expect(findActiveStep(lifecycle)).toBeUndefined();
    });

    it('should skip the initial status when the config has no terminal list', () => {
        const lifecycle = createManager(
            [
                { id: 'one', name: 'One', status: 'pending', details: [] },
                { id: 'two', name: 'Two', status: 'working', details: [] },
            ],
            {
                statuses: ['pending', 'working', 'done'],
                initial: 'pending',
                transitions: { pending: ['working'], working: ['done'] },
            },
        );

        expect(findActiveStep(lifecycle)?.id).toBe('two');
    });
});
