import { WorkflowSecretMessages } from '@/src/utils/constants';

export const getWorkflowSecretKey = (): string => {
    const secret = process.env['HUB_MASON_WORKFLOW_SECRET_KEY'];

    if (!secret) {
        throw new Error(WorkflowSecretMessages.MISSING_SECRET);
    }

    return secret;
};
