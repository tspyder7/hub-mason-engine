import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { routeRequest } from '@/src/router';
import { toLoggableError } from '@/src/utils/redact-secrets';

(async () => {
    try {
        WorkflowContext.getInstance();

        await routeRequest();
    } catch (error) {
        logger.error(
            { err: toLoggableError(error) },
            'Workflow run failed before the request lifecycle could start',
        );

        process.exit(1);
    }
})();
