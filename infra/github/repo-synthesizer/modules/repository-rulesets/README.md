# repository-rulesets module

Applies the default-branch protection ruleset to the synthesized repository. This is the last module in the composition (depends on `repository-files` so protection lands after bootstrap commits).

## Resources

| Resource                          | Purpose                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `github_repository_ruleset`       | `protected-branch-rules` targeting `~DEFAULT_BRANCH`, enforcement `active`: blocks deletion and non-fast-forward; requires code-owner review, resolved threads, stale-review dismissal on push. |

## Inputs

| Name                              | Type     | Default | Description                                                              |
| --------------------------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `repository_name`                 | `string` | —       | Repository name — pass `module.repository.repo_name`.                    |
| `required_approving_review_count` | `number` | `1`     | Approving reviews required before merge (may be `0` for solo/personal work). |

## Outputs

None.

## Example

```hcl
module "repository_rulesets" {
  source = "./modules/repository-rulesets"

  repository_name                 = module.repository.repo_name
  required_approving_review_count = 1

  depends_on = [module.repository_files]
}
```

## Notes

- Targets `~DEFAULT_BRANCH`, so it follows the repository's default branch (`main` via the `repository` module).
- Allowed merge methods are `merge`, `squash`, and `rebase`.
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
