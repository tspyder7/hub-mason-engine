import { RequestError } from 'octokit';

import { toStepError } from 'hub-mason-core/lifecycle/core/errors';

import {
    redactSecrets,
    toLoggableError,
    toRedactedStepError,
} from '@/src/utils/redact-secrets';

const TOKEN = 'top-secret-value';
const APP_TOKEN = 'app-token-value';
const SECRET = 'workflow-secret-value';

const stubSecrets = (): void => {
    vi.stubEnv('HUB_MASON_TOP_SECRET_TOKEN', TOKEN);
    vi.stubEnv('HUB_MASON_GITHUB_APP_TOKEN', APP_TOKEN);
    vi.stubEnv('HUB_MASON_WORKFLOW_SECRET_KEY', SECRET);
};

const authHeaderError = (message: string): RequestError =>
    new RequestError(message, 500, {
        request: {
            method: 'GET',
            url: 'https://api.github.com/repos/acme/x',
            headers: {
                authorization: `Bearer ${APP_TOKEN}`,
            },
        },
    });

vi.mock('hub-mason-core/lifecycle/core/errors', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('hub-mason-core/lifecycle/core/errors')
        >();

    return { ...actual, toStepError: vi.fn(actual.toStepError) };
});

beforeEach(() => {
    vi.unstubAllEnvs();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('redactSecrets', () => {
    it('should return text unchanged when no secrets are set', () => {
        expect(redactSecrets('plain tofu output')).toBe('plain tofu output');
    });

    it('should replace every known secret value', () => {
        stubSecrets();

        expect(redactSecrets(`a ${TOKEN} b ${APP_TOKEN} c ${SECRET}`)).toBe(
            'a [REDACTED] b [REDACTED] c [REDACTED]',
        );
    });

    it('should redact tokens embedded in urls', () => {
        stubSecrets();

        expect(redactSecrets(`https://${TOKEN}@github.com/acme/repo`)).toBe(
            'https://[REDACTED]@github.com/acme/repo',
        );
    });

    it('should skip empty variables without mangling the text', () => {
        stubSecrets();
        vi.stubEnv('HUB_MASON_TOP_SECRET_TOKEN', '');

        expect(redactSecrets(`x ${APP_TOKEN} y`)).toBe('x [REDACTED] y');
    });
});

describe('toLoggableError', () => {
    it('should drop request headers while keeping the status', () => {
        stubSecrets();

        const logged = toLoggableError(authHeaderError('rate limited'));

        expect(logged).toEqual({ message: 'rate limited', status: 500 });
        expect(JSON.stringify(logged)).not.toContain('authorization');
        expect(JSON.stringify(logged)).not.toContain(APP_TOKEN);
    });

    it('should redact secrets from the message and stack', () => {
        stubSecrets();

        const logged = toLoggableError(new Error(`boom ${TOKEN}`));

        expect(logged.message).toBe('boom [REDACTED]');
        expect(logged.stack).not.toContain(TOKEN);
        expect(logged).not.toHaveProperty('request');
    });

    it('should keep a string or numeric code', () => {
        expect(
            toLoggableError(Object.assign(new Error('denied'), { code: 13 })),
        ).toMatchObject({ message: 'denied', code: 13 });
        expect(
            toLoggableError(
                Object.assign(new Error('denied'), { code: 'EACCES' }),
            ),
        ).toMatchObject({ message: 'denied', code: 'EACCES' });
    });

    it('should drop a non-primitive code', () => {
        const logged = toLoggableError(
            Object.assign(new Error('odd'), { code: { nested: true } }),
        );

        expect(logged).toEqual({
            message: 'odd',
            stack: expect.any(String),
        });
    });

    it('should fall back to the message when the stack is missing', () => {
        const error = new Error('bare') as Error & { stack?: string };
        delete error.stack;

        expect(toLoggableError(error)).toMatchObject({
            message: 'bare',
            stack: 'bare',
        });
    });

    it('should stringify non-error values with secrets redacted', () => {
        stubSecrets();

        expect(toLoggableError(`oops ${SECRET}`)).toEqual({
            message: 'oops [REDACTED]',
        });
    });
});

describe('toRedactedStepError', () => {
    it('should redact secrets from the step message and stack', () => {
        stubSecrets();

        const stepError = toRedactedStepError(new Error(`failed ${TOKEN}`));

        expect(stepError.message).not.toContain(TOKEN);
        expect(stepError.message).toContain('[REDACTED]');
        expect(stepError.stack).not.toContain(TOKEN);
    });

    it('should keep a stackless error without failing', () => {
        stubSecrets();
        vi.mocked(toStepError).mockReturnValueOnce({
            message: `failed ${SECRET}`,
            stack: undefined,
        });

        const stepError = toRedactedStepError(new Error('unused'));

        expect(stepError.message).toBe('failed [REDACTED]');
        expect(stepError.stack).toBeUndefined();
    });
});
