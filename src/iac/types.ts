export enum IaCProviderDriver {
    OPENTOFU = 'opentofu',
}

export type IaCRunResult = {
    stdout: string;
    stderr: string;
};

export type IaCVars = Record<string, unknown>;

export type IaCProvider = 'opentofu';

export type IaCStackConfig = {
    moduleDir: string;
    varsFileName?: string;
    planFileName?: string;
    tokenEnvVar: string;
    tokenTargetEnvVar?: string;
};

export type IaCDriver = {
    readonly moduleDir: string;
    readonly varsFile: string;
    readonly planFile: string;
    writeVars: (vars: IaCVars) => Promise<void>;
    init: () => Promise<void>;
    plan: () => Promise<string>;
    apply: (planFile: string) => Promise<void>;
    output: () => Promise<string>;
    cleanup: () => Promise<void>;
};

/**
 * Base failure for every IaC backend. Tool-specific errors extend this so
 * handlers can catch one type regardless of the provider in use.
 */
export class IaCError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IaCError';
    }
}
