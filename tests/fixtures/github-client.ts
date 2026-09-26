import { GithubClient } from 'hub-mason-core/github/client';
import { vi } from 'vitest';

export const mockGithubClient = <T extends Record<string, unknown>>(rest: T) =>
    vi.spyOn(GithubClient, 'getInstance').mockReturnValue({ rest } as never);
