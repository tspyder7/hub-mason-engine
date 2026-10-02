# repository-files module

Bootstraps baseline files in the synthesized repository: a `README.md` (name + description) and `.github/CODEOWNERS` (`* @<code_owner>`).

## Resources

| Resource                   | Purpose                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `github_repository_file.readme`     | Writes `README.md` on the default branch (`overwrite_on_create = true`).        |
| `github_repository_file.codeowners` | Writes `.github/CODEOWNERS` as `* @<code_owner>` (`overwrite_on_create = true`). |

## Inputs

| Name             | Type     | Default  | Description                                                              |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------ |
| `name`           | `string` | —        | Repository name — pass `module.repository.repo_name`.                    |
| `description`    | `string` | `""`     | Description rendered inside the bootstrapped `README.md`.                 |
| `code_owner`     | `string` | —        | CODEOWNERS handle without `@` (must not be empty; root falls back to `github_owner`). |
| `default_branch` | `string` | `"main"` | Branch to commit bootstrap files to — pass `module.repository.repo_default_branch`. |

## Outputs

None.

## Example

```hcl
module "repository_files" {
  source = "./modules/repository-files"

  name           = module.repository.repo_name
  description    = "Hosts the identity service"
  code_owner     = "acme"
  default_branch = module.repository.repo_default_branch

  depends_on = [module.repository]
}
```

## Notes

- `overwrite_on_create = true` means apply **overwrites** `README.md` and `.github/CODEOWNERS` in the target repo — intentional for bootstrapping, destructive if the repo already has custom content.
- `repository-rulesets` depends on this module (`depends_on = [module.repository_files]` in root `main.tf`); keep that ordering so branch protection lands after bootstrap commits.
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
