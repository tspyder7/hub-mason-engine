# actions module

Locks down GitHub Actions and workflow permissions on the synthesized repository to secure defaults.

## Resources

| Resource                                | Purpose                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| `github_actions_repository_permissions` | `allowed_actions = "all"`.                                           |
| `github_workflow_repository_permissions`| Default workflow permissions `read`; `can_approve_pull_request_reviews = false`. |

## Inputs

| Name   | Type     | Default | Description                                                        |
| ------ | -------- | ------- | ------------------------------------------------------------------ |
| `name` | `string` | —       | Repository name — pass `module.repository.repo_name` (not a plain var). |

## Outputs

None.

## Example

```hcl
module "actions" {
  source = "./modules/actions"

  name = module.repository.repo_name
}
```

## Notes

- Runs after `module.repository` (root wires ordering via `main.tf`).
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
