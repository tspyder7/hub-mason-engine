import { afterEach, vi } from 'vitest';

import * as github from '@actions/github';

const mockLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
};

vi.mock('hub-mason-core/utils/logger', () => ({
    logger: mockLogger,
}));

afterEach(() => {
    delete (github.context.payload as { inputs?: unknown }).inputs;
});
