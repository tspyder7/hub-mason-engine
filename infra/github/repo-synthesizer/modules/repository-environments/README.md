# repository-environments module

Provisions the standard deployment environments for the synthesized repository: protected `staging` and `production` (protected branches, reviewers enabled) plus unprotected `development` (no reviewers).

## Resources

| Resource                        | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `github_repository_environment` | One per entry in `local.environments` (`config.tf`), with branch policy and reviewer blocks. |
| `data.github_user` (per reviewer username) | Resolves reviewer usernames to numeric IDs.              |

## Inputs

| Name                 | Type           | Default | Description                                                              |
| -------------------- | -------------- | ------- | ------------------------------------------------------------------------ |
| `repository_name`    | `string`       | —       | Repository name — pass `module.repository.repo_name`.                    |
| `reviewer_usernames` | `list(string)` | `[]`    | Usernames allowed to approve protected-environment deployments (resolved via `data.github_user`). |
| `reviewer_users`     | `list(number)` | `[]`    | Extra numeric user IDs allowed to approve deployments.                   |
| `reviewer_teams`     | `list(number)` | `[]`    | Numeric team IDs allowed to approve deployments (IDs, not slugs — look IDs up first). |

Reviewer inputs are asymmetric by design: `reviewer_usernames` are strings resolved to IDs, while `reviewer_teams` / `reviewer_users` are numeric IDs. Final user reviewer list is `concat(data.github_user.*, var.reviewer_users)` (`config.tf`).

## Outputs

None (environment names are fixed: `staging`, `production`, `development`).

## Example

```hcl
module "repository_environments" {
  source = "./modules/repository-environments"

  repository_name    = module.repository.repo_name
  reviewer_usernames = ["octocat"]
  reviewer_teams     = [1234567]

  depends_on = [module.repository]
}
```

## Notes

- Environment matrix lives in `config.tf` (`locals.environments`); edit there to change protection policy per environment.
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
