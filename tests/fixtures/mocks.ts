import { vi } from 'vitest';

export const onTransitionMock = vi.fn();
export const postSummaryMock = vi.fn();

export const commentReporterMockModule = () => ({
    createGithubCommentReporter: vi.fn(() => ({
        onTransition: onTransitionMock,
    })),
    postSummaryComment: postSummaryMock,
});

export const withUnlockedIssueMockModule = () => ({
    withUnlockedIssue: vi.fn((input: { fn: () => Promise<unknown> }) =>
        input.fn(),
    ),
});

export const mockProcessExit = () =>
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
