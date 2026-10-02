import { createOpenTofuDriver } from './opentofu/driver';
import { IaCError } from './types';

import type { IaCDriver, IaCProvider, IaCStackConfig } from './types';

type IaCDriverFactory = (config: IaCStackConfig) => IaCDriver;

const DRIVERS: Record<IaCProvider, IaCDriverFactory> = {
    opentofu: createOpenTofuDriver,
};

/**
 * Selects the concrete IaC backend for a stack.
 *
 * Handlers call this instead of importing a tool module directly, so a future
 * backend only registers its driver in `DRIVERS` while handler code keeps
 * talking to `IaCDriver`.
 *
 * @param provider - Backend to instantiate.
 * @param config - Stack directory, file names and token env var names.
 * @returns Driver for the requested backend.
 * @throws IaCError when the provider is unknown.
 */
export const createIaCDriver = (
    provider: IaCProvider,
    config: IaCStackConfig,
): IaCDriver => {
    const factory = DRIVERS[provider];

    if (!factory) {
        throw new IaCError(`Unsupported IaC provider: ${provider}`);
    }

    return factory(config);
};
