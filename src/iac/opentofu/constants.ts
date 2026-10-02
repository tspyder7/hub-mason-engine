export const OPENTOFU_BINARY = 'tofu' as const;

export const OPENTOFU_COMMAND = {
    INIT: 'init',
    PLAN: 'plan',
    APPLY: 'apply',
    OUTPUT: 'output',
} as const;

export const OPENTOFU_FLAG = {
    INPUT_FALSE: '-input=false',
    NO_COLOR: '-no-color',
    VAR_FILE: '-var-file',
    OUT: '-out',
    JSON: '-json',
} as const;

export const OPENTOFU_ENV = {
    DEFAULT_TOKEN_TARGET: 'GITHUB_TOKEN',
    AUTOMATION: 'TF_IN_AUTOMATION',
    AUTOMATION_VALUE: '1',
} as const;

export const OPENTOFU_STATE_FILE = {
    STATE: 'terraform.tfstate',
    STATE_BACKUP: 'terraform.tfstate.backup',
} as const;

export const OPENTOFU_ENCODING = 'utf8' as const;

export const DEFAULT_VARS_FILE_NAME = 'vars.tfvars.json' as const;
export const DEFAULT_PLAN_FILE_NAME = 'tfplan' as const;
export const DEFAULT_TOKEN_TARGET_ENV_VAR = OPENTOFU_ENV.DEFAULT_TOKEN_TARGET;

export const MAX_BUFFER = 10 * 1024 * 1024;
