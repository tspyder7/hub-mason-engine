# labels module

Manages the full issue-label taxonomy for a synthesized repository as a single authoritative set. Uses `github_issue_labels` (not `github_issue_label`), so GitHub default labels (`bug`, `documentation`, `enhancement`, …) are deleted on apply and only the 32 labels defined in `labels.tf` remain.

## Resources

| Resource               | Purpose                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `github_issue_labels`  | Authoritative label set for `var.repository_name`; `dynamic "label"` blocks from `local.labels`. |

## Inputs

| Name              | Type     | Default | Description                              |
| ----------------- | -------- | ------- | ---------------------------------------- |
| `repository_name` | `string` | —       | Repository name (from `module.repository.repo_name`). |

## Taxonomy

All 32 colors are unique and chosen for white-background contrast with semantic hues per group.

| Group              | Labels                                                                 | Color logic                                              |
| ------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `app`              | `app`                                                                  | Product blue `1d76db`. Static name so repo renames never orphan issues. |
| `type:*` (14)      | `feature`, `bug`, `hotfix`, `enhancement`, `refactor`, `chore`, `docs`, `test`, `ci`, `build`, `dependencies`, `security`, `performance`, `style` | Kind of work. Reds for defects (`bug` `d73a4a`, `hotfix` `b60205`, `security` `82071e`), blues for build/discovery (`feature` `0052cc`, `enhancement` `0969da`, `docs` `0075ca`, `dependencies` `0366d6`), purple for structure (`refactor` `5319e7`, `build` `7057ff`), gray for housekeeping (`chore` `6e7681`, `style` `59636e`), teal for automation (`ci` `087990`), gold for tests (`test` `9a6700`), burnt orange for speed (`performance` `e36d00`). |
| `status:*` (8)     | `draft`, `ready-for-review`, `in-review`, `changes-requested`, `approved`, `blocked`, `ready-to-merge`, `merge-conflict` | Workflow stage. Gray draft (`57606a`), green ready/approved (`1f883d` / `0e8a16`), yellow in-review (`fbca04`), orange changes (`d93f0b`), red blocked (`cf222e`), purple ready-to-merge (`8250df`), crimson conflict (`a40e26`). |
| `priority:*` (4)   | `critical`, `high`, `medium`, `low`                                    | Severity heat scale. `8b0000` → `e5534b` → `c69000` → `2da44e`. |
| `size:*` (5)       | `xs`, `s`, `m`, `l`, `xl`                                              | PR size by changed files. Navy → blue → light blue → salmon → maroon (`0a3069`, `2188ff`, `54aeff`, `ff7b72`, `5c0a0a`). |

## Example

```hcl
module "issue_labels" {
  source = "./modules/issues/labels"

  repository_name = module.repository.repo_name

  depends_on = [module.repository]
}
```

## Notes

- Do not mix with `github_issue_label` in the same repo — the two resources fight over policy. This module is authoritative; the singular resource is for non-authoritative additions only.
- Renames are destructive: case / color / description edits happen in place, but a name change (beyond case) deletes the old label and creates a new one, stripping it from attached issues/PRs.
- `type:bug` is the single defect label; `type:fix` was removed as a duplicate. `type:feature` means net-new capability, `type:enhancement` means improvement to an existing capability.
- When a repository is archived, deletion is skipped to avoid API errors; labels are cleared from state only.
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
