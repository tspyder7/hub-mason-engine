import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';

import * as github from '@actions/github';

import {
    getWorkflowInputs,
    getWorkflowRun,
} from '@/src/config/workflow-config';

import {
    WORKFLOW_OWNER,
    WORKFLOW_REPO,
    RUN_ID,
} from '../fixtures/workflow-dispatch';

const setPayloadInputs = (inputs: unknown): void => {
    if (inputs === undefined) {
        delete (github.context.payload as { inputs?: unknown })['inputs'];
    } else {
        github.context.payload['inputs'] = inputs as never;
    }
};

describe('workflow-config', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('getWorkflowInputs', () => {
        it('reads the request and context inputs from the event payload', () => {
            setPayloadInputs({
                request: '{"name":"a"}',
                context: '{"requestId":"R-1"}',
            });

            expect(getWorkflowInputs()).toEqual({
                request: '{"name":"a"}',
                context: '{"requestId":"R-1"}',
            });
        });

        it('defaults the inputs to empty strings when they are not set', () => {
            setPayloadInputs(undefined);

            expect(getWorkflowInputs()).toEqual({ request: '', context: '' });
        });

        it('defaults non-string inputs to empty strings', () => {
            setPayloadInputs({ request: 123, context: 456 });

            expect(getWorkflowInputs()).toEqual({ request: '', context: '' });
        });
    });

    describe('getWorkflowRun', () => {
        beforeEach(() => {
            vi.stubEnv('GITHUB_RUN_ID', RUN_ID);
            vi.stubEnv(
                'GITHUB_REPOSITORY',
                `${WORKFLOW_OWNER}/${WORKFLOW_REPO}`,
            );
        });

        it('resolves the running workflow run', () => {
            vi.stubEnv('GITHUB_SERVER_URL', 'https://github.com');
            vi.stubEnv('GITHUB_RUN_ATTEMPT', '2');

            expect(getWorkflowRun()).toEqual({
                runId: 123,
                runUrl: 'https://github.com/acme/hub-mason-engine/actions/runs/123',
                owner: WORKFLOW_OWNER,
                repo: WORKFLOW_REPO,
                attempt: 2,
            });
        });

        it('defaults the server url and the attempt number', () => {
            expect(getWorkflowRun()).toMatchObject({
                runUrl: 'https://github.com/acme/hub-mason-engine/actions/runs/123',
                attempt: 1,
            });
        });

        it('throws when the run id is missing', () => {
            vi.stubEnv('GITHUB_RUN_ID', '');

            expect(() => getWorkflowRun()).toThrow(ValidationError);
            expect(() => getWorkflowRun()).toThrow(
                'Missing required environment variables: GITHUB_RUN_ID, GITHUB_REPOSITORY',
            );
        });

        it('throws when the repository is missing', () => {
            vi.stubEnv('GITHUB_REPOSITORY', '');

            expect(() => getWorkflowRun()).toThrow(
                'Missing required environment variables: GITHUB_RUN_ID, GITHUB_REPOSITORY',
            );
        });

        it('throws when the repository has no repository name', () => {
            vi.stubEnv('GITHUB_REPOSITORY', WORKFLOW_OWNER);

            expect(() => getWorkflowRun()).toThrow(
                'Missing required environment variables: GITHUB_RUN_ID, GITHUB_REPOSITORY',
            );
        });

        it('throws when the repository is not set at all', () => {
            vi.stubEnv('GITHUB_REPOSITORY', undefined);

            expect(() => getWorkflowRun()).toThrow(
                'Missing required environment variables: GITHUB_RUN_ID, GITHUB_REPOSITORY',
            );
        });
    });
});
