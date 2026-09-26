import { logger } from 'hub-mason-core/utils/logger';

import { WorkflowContext } from '@/src/context/workflow-context';
import { routeRequest } from '@/src/router';

(async () => {
    try {
        WorkflowContext.getInstance();

        await routeRequest();
    } catch (error) {
        logger.error(
            { err: error },
            'Workflow run failed before the request lifecycle could start',
        );

        process.exit(1);
    }
})();
