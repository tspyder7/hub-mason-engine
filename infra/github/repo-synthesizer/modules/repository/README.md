# repository module

Creates the GitHub repository itself and pins its default branch. This is the first module in the `repo-synthesizer` composition — every other module consumes its outputs.

## Resources

| Resource                  | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `github_repository`       | Repository with name, visibility, description, topics; issues/projects/wiki on, discussions off, `auto_init = true`. |
| `github_branch_default`   | Forces the default branch to `main`.                         |

## Inputs

| Name          | Type           | Default | Description                                              |
| ------------- | -------------- | ------- | -------------------------------------------------------- |
| `name`        | `string`       | —       | Repository name (from root `repo_name`).                 |
| `description` | `string`       | `""`    | Repository description.                                  |
| `visibility`  | `string`       | —       | `public`, `private`, or `internal` (validated).          |
| `topics`      | `list(string)` | `[]`    | Topics/tags applied to the repository.                   |

## Outputs

| Name                | Description                          |
| ------------------- | ------------------------------------ |
| `repo_id`           | Numeric GitHub repository ID.        |
| `repo_name`         | Repository name (feed downstream modules with this, not `var.repo_name`). |
| `repo_http_clone_url` | HTTPS clone URL.                   |
| `repo_ssh_clone_url`  | SSH clone URL.                     |
| `repo_default_branch` | Default branch (`main`; feed to `repository-files`). |

## Example

```hcl
module "repository" {
  source = "./modules/repository"

  name        = "identity-service"
  description = "Hosts the identity service"
  topics      = ["go", "grpc"]
  visibility  = "private"
}
```

## Notes

- `auto_init = true` is required so the default branch exists for `github_branch_default` and for `repository-files` bootstrap commits.
- `internal` visibility only works for org-owned accounts; it fails on personal accounts.
- Provider `integrations/github` `6.13.0` is pinned in `providers.tf` — keep in sync with the root and all sibling modules.
