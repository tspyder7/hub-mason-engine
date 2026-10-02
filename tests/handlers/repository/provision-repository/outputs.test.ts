import { ValidationError } from 'hub-mason-core/lifecycle/core/errors';

import { parseRepositoryOutputs } from '@/src/handlers/repository/provision-repository/outputs';

const VALID_OUTPUT = JSON.stringify({
    repo_id: { sensitive: false, value: 42 },
    repo_name: { sensitive: false, value: 'identity-service' },
    repo_http_clone_url: {
        sensitive: false,
        value: 'https://github.com/acme/identity-service.git',
    },
    repo_ssh_clone_url: {
        sensitive: false,
        value: 'git@github.com:acme/identity-service.git',
    },
    repo_default_branch: { sensitive: false, value: 'main' },
    unrelated_output: { sensitive: true, value: 'ignored' },
});

describe('parseRepositoryOutputs', () => {
    it('should map the tofu output values onto the repository outputs', () => {
        const outputs = parseRepositoryOutputs(VALID_OUTPUT);

        expect(outputs).toEqual({
            repoId: '42',
            repoName: 'identity-service',
            repoHttpCloneUrl: 'https://github.com/acme/identity-service.git',
            repoSshCloneUrl: 'git@github.com:acme/identity-service.git',
            repoDefaultBranch: 'main',
        });
    });

    it('should accept a string repository id', () => {
        const outputs = parseRepositoryOutputs(
            JSON.stringify({
                ...JSON.parse(VALID_OUTPUT),
                repo_id: { value: '42' },
            }),
        );

        expect(outputs.repoId).toBe('42');
    });

    it('should reject output that is not JSON', () => {
        expect(() => parseRepositoryOutputs('')).toThrow(ValidationError);
        expect(() => parseRepositoryOutputs('')).toThrow(
            'Invalid OpenTofu output JSON',
        );
    });

    it('should reject output that misses a required value', () => {
        const incomplete = JSON.stringify({
            repo_name: { value: 'identity-service' },
        });

        expect(() => parseRepositoryOutputs(incomplete)).toThrow(
            ValidationError,
        );
        expect(() => parseRepositoryOutputs(incomplete)).toThrow(
            'OpenTofu output:',
        );
    });
});
