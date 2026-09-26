import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';
import { logger } from 'hub-mason-core/utils/logger';
import { RequestError } from 'octokit';

import { WorkflowContext } from '@/src/context/workflow-context';
import {
    parseRequestPayload,
    validate,
    verifyPortalIssue,
} from '@/src/handlers/repository/provision-repository/request-validator';
import { RequestType } from '@/src/utils/constants';

import { mockGithubClient } from '../../../fixtures/github-client';
import {
    createContext,
    createWorkflowContext,
    createInputs,
    createRequest,
    PORTAL,
    REQUEST_ID,
    SECRET,
} from '../../../fixtures/workflow-dispatch';

const signedContext = (overrides: Record<string, unknown> = {}) => ({
    ...createContext(),
    ...overrides,
});

const notFound = (message: string) =>
    new RequestError(message, 404, {
        request: {
            method: 'GET',
            url: '/repos/acme/hub-mason-portal',
            headers: {},
        },
    });

const issueGetMock = vi.fn();
const commentGetMock = vi.fn();

describe('request-validator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        WorkflowContext.reset();
        createWorkflowContext();
        mockGithubClient({
            issues: { get: issueGetMock, getComment: commentGetMock },
        });
        issueGetMock.mockResolvedValue({
            data: {
                number: PORTAL.issueNumber,
                title: 'Provision identity-service',
                state: 'open',
                locked: true,
            },
        });
        commentGetMock.mockResolvedValue({ data: { id: 42 } });
    });

    afterEach(() => {
        WorkflowContext.reset();
        vi.restoreAllMocks();
    });

    describe('parseRequestPayload', () => {
        it('should accept a repository provisioning request', () => {
            expect(parseRequestPayload(createRequest())).toEqual({
                name: 'identity-service',
                description: 'Hosts the identity service',
                isPublic: false,
                topics: ['go', 'grpc'],
            });
        });

        it('should drop unknown fields from the payload', () => {
            expect(
                parseRequestPayload({
                    ...createRequest(),
                    hasAdminAccess: true,
                }),
            ).toEqual(createRequest());
        });

        it('should normalise the issue form still dispatched by the portal', () => {
            // Verbatim payload of a real dispatch from hub-mason-portal main.
            const payload = {
                name: 'test-repo-10',
                description: 'This is test repo 10',
                visibility: ['public'],
                topics: 'go test python2',
            };

            expect(parseRequestPayload(payload)).toEqual({
                name: 'test-repo-10',
                description: 'This is test repo 10',
                isPublic: true,
                topics: ['go', 'test', 'python2'],
            });
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'Request payload uses the deprecated portal shape',
                ),
            );
        });

        it('should default the issue form to a private repository without topics', () => {
            expect(
                parseRequestPayload({
                    name: 'test-repo-10',
                    description: 'This is test repo 10',
                    visibility: [],
                }),
            ).toEqual({
                name: 'test-repo-10',
                description: 'This is test repo 10',
                isPublic: false,
                topics: [],
            });
        });

        it('should fail closed to private for an unknown visibility', () => {
            expect(
                parseRequestPayload({
                    name: 'test-repo-10',
                    description: 'This is test repo 10',
                    visibility: ['internal'],
                    topics: 'go',
                }),
            ).toMatchObject({ isPublic: false });
        });

        it('should ignore repeated spaces in the issue form topics', () => {
            expect(
                parseRequestPayload({
                    name: 'test-repo-10',
                    description: 'This is test repo 10',
                    visibility: ['private'],
                    topics: 'go   test ',
                }),
            ).toMatchObject({ topics: ['go', 'test'] });
        });

        it('should report the issue form error for an invalid issue payload', () => {
            expect(() =>
                parseRequestPayload({
                    name: 'ab',
                    description: 'This is test repo 10',
                    visibility: ['public'],
                    topics: 'go',
                }),
            ).toThrow(
                'Invalid provision repository request: Repository name must be greater than 2 characters',
            );
        });

        it('should report the contract error for an unknown payload shape', () => {
            expect(() => parseRequestPayload('not-an-object')).toThrow(
                'Invalid provision repository request',
            );
            expect(() => parseRequestPayload('not-an-object')).toThrow(
                ValidationError,
            );
        });

        it('should throw when the repository name is empty', () => {
            expect(() =>
                parseRequestPayload(createRequest({ name: '' })),
            ).toThrow(
                'Invalid provision repository request: Repository name is required',
            );
        });

        it('should throw when the repository name is too short', () => {
            expect(() =>
                parseRequestPayload(createRequest({ name: 'ab' })),
            ).toThrow(
                'Invalid provision repository request: Repository name must be greater than 2 characters',
            );
        });

        it('should throw when the repository name has spaces', () => {
            expect(() =>
                parseRequestPayload(createRequest({ name: 'my repo' })),
            ).toThrow(
                'Invalid provision repository request: Repository name should not contain empty spaces',
            );
        });

        it('should throw when the description is empty', () => {
            expect(() =>
                parseRequestPayload(createRequest({ description: '' })),
            ).toThrow('Repository description is required');
        });

        it('should throw when the visibility flag is not a boolean', () => {
            expect(() =>
                parseRequestPayload(
                    createRequest({ isPublic: 'public' as unknown as boolean }),
                ),
            ).toThrow('Invalid provision repository request');
        });

        it('should throw when a topic is empty', () => {
            expect(() =>
                parseRequestPayload(createRequest({ topics: [''] })),
            ).toThrow('Invalid provision repository request');
        });
    });

    describe('validate', () => {
        it('should verify the signature and return the dispatch and request', () => {
            const context = createContext();
            const { dispatch, request } = validate(createInputs({ context }));

            expect(dispatch.requestId).toBe(REQUEST_ID);
            expect(dispatch.requestType).toBe(RequestType.PROVISION_REPOSITORY);
            expect(dispatch.issuedAt).toBe(context.issuedAt);
            expect(dispatch.signature).toBe(context.signature);
            expect(dispatch.actor).toBe('hub-mason-bot');
            expect(dispatch.portal).toEqual(PORTAL);
            expect(dispatch.lifecycleSnapshot.steps).toHaveLength(3);
            expect(request).toEqual(createRequest());
            expect(logger.info).toHaveBeenCalledWith(
                `Verified dispatch ${REQUEST_ID} of type repository/provision-repository issued at ${dispatch.issuedAt}`,
            );
        });

        it('should throw when the shared secret is missing', () => {
            vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', '');

            expect(() => validate(createInputs())).toThrow(
                'Missing required environment variable: HUB_MASON_WORKFLOW_SECRET_KEY',
            );
        });

        it('should throw when the context input is missing', () => {
            expect(() => validate(createInputs({ context: '' }))).toThrow(
                'Missing context input',
            );
        });

        it('should throw when the context is not valid JSON', () => {
            expect(() => validate(createInputs({ context: '{a:1}' }))).toThrow(
                'Invalid context JSON',
            );
        });

        it('should throw when the signature does not match the secret', () => {
            vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', 'another-secret');

            expect(() => validate(createInputs())).toThrow('invalid signature');
        });

        it('should throw when the dispatch is expired', () => {
            const issuedAt = new Date(
                Date.now() - 60 * 60 * 1000,
            ).toISOString();
            const context = createInputs({
                context: signedContext({
                    issuedAt,
                    signature: 'a'.repeat(64),
                }),
            });

            expect(() => validate(context)).toThrow('signature expired');
        });

        it('should throw when the snapshot request id does not match the context', () => {
            const context = createInputs({
                context: signedContext({
                    lifecycleSnapshot: {
                        ...createContext().lifecycleSnapshot,
                        meta: {
                            ...createContext().lifecycleSnapshot.meta,
                            requestId: 'other',
                        },
                    },
                }),
            });

            expect(() => validate(context)).toThrow(
                'requestId mismatch between context and snapshot meta',
            );
        });

        it('should throw when the request type is not a provision repository request', () => {
            const context = createInputs({
                context: signedContext({ requestType: 'repository/other' }),
            });

            expect(() => validate(context)).toThrow(
                'Unexpected request type: repository/provision-repository',
            );
            expect(logger.error).toHaveBeenCalledWith(
                'Unexpected request type: repository/provision-repository',
            );
        });

        it('should throw when the portal locator is missing from the context', () => {
            const withoutPortal: Record<string, unknown> = {
                ...signedContext(),
            };
            delete withoutPortal['portal'];

            const context = createInputs({ context: withoutPortal });

            expect(() => validate(context)).toThrow(ValidationError);
            expect(() => validate(context)).toThrow('Invalid dispatch context');
        });

        it('should throw when the portal locator is incomplete', () => {
            const context = createInputs({
                context: signedContext({ portal: { owner: 'acme' } }),
            });

            expect(() => validate(context)).toThrow('Invalid dispatch context');
        });

        it('should throw when the request input is missing', () => {
            expect(() => validate(createInputs({ request: '' }))).toThrow(
                'Invalid request JSON',
            );
        });

        it('should throw when the request is not valid JSON', () => {
            expect(() => validate(createInputs({ request: '{a:1}' }))).toThrow(
                'Invalid request JSON',
            );
        });

        it('should throw when the request payload is invalid', () => {
            expect(() =>
                validate(
                    createInputs({ request: createRequest({ name: 'a' }) }),
                ),
            ).toThrow(
                'Invalid provision repository request: Repository name must be greater than 2 characters',
            );
        });

        it('should sign the handoff with the shared secret', () => {
            const { dispatch } = validate(createInputs());

            expect(dispatch.signature).toMatch(/^[0-9a-f]{64}$/);
            expect(SECRET).toBe('test-secret');
        });
    });

    describe('verifyPortalIssue', () => {
        it('should verify the issue and its status comment', async () => {
            const summary = await verifyPortalIssue(PORTAL);

            expect(summary).toEqual({
                number: 7,
                title: 'Provision identity-service',
                state: 'open',
                locked: true,
                commentId: 42,
            });
            expect(issueGetMock).toHaveBeenCalledWith({
                owner: 'acme',
                repo: 'hub-mason-portal',
                issue_number: 7,
            });
            expect(commentGetMock).toHaveBeenCalledWith({
                owner: 'acme',
                repo: 'hub-mason-portal',
                comment_id: 42,
            });
            expect(logger.info).toHaveBeenCalledWith(
                'Verifying portal issue acme/hub-mason-portal#7',
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Verified portal issue acme/hub-mason-portal#7',
            );
        });

        it('should skip the comment check when the portal has no status comment', async () => {
            const summary = await verifyPortalIssue({
                ...PORTAL,
                statusCommentId: null,
            });

            expect(commentGetMock).not.toHaveBeenCalled();
            expect(summary.commentId).toBeNull();
        });

        it('should report an unlocked issue as not locked', async () => {
            issueGetMock.mockResolvedValueOnce({
                data: { number: 7, title: 't', state: 'open' },
            });

            const summary = await verifyPortalIssue(PORTAL);

            expect(summary.locked).toBe(false);
        });

        it('should throw a validation error when the issue does not exist', async () => {
            issueGetMock.mockRejectedValue(notFound('Not Found'));

            await expect(verifyPortalIssue(PORTAL)).rejects.toThrow(
                ValidationError,
            );
            await expect(verifyPortalIssue(PORTAL)).rejects.toThrow(
                'Issue acme/hub-mason-portal#7 not found',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ err: expect.anything() }),
                'Issue acme/hub-mason-portal#7 not found',
            );
        });

        it('should throw a validation error when the status comment does not exist', async () => {
            commentGetMock.mockRejectedValue(notFound('Not Found'));

            await expect(verifyPortalIssue(PORTAL)).rejects.toThrow(
                'Status comment 42 on acme/hub-mason-portal#7 not found',
            );
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ err: expect.anything() }),
                'Status comment 42 on acme/hub-mason-portal#7 not found',
            );
        });

        it('should propagate other github errors', async () => {
            issueGetMock.mockRejectedValueOnce(new Error('Network issue'));

            await expect(verifyPortalIssue(PORTAL)).rejects.toThrow(
                'Network issue',
            );
        });
    });
});
