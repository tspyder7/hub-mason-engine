# repo-synthesizer

> Declarative GitHub repository bootstrapping and governance engine powered by OpenTofu.

`repo-synthesizer` automates the end-to-end lifecycle of new GitHub repositories. Instead of manually configuring repository settings, environments, branch protection rules, and initial files across multiple UI screens, it provisions a standardized, production-ready repository state in a single OpenTofu execution.

Ported from the POC at `~/practice/opentofu/repo-synthesizer` (branch `main`). The POC uses an `environments/production/` wrapper around `modules/*`; here the production environment is flattened so `infra/repo-synthesizer/` itself is the runnable root (composition in `main.tf`, sources as `./modules/...`). Module contents are otherwise identical to the POC.

## Why repo-synthesizer?

Creating a repository is easy; configuring it correctly per organizational standards takes time and is prone to human error.

- **Zero-touch provisioning:** repositories, environments, branch rulesets, and baseline files in one apply.
- **Declarative governance:** CODEOWNERS, branch protections, secrets, and topics as code.
- **Instant standardization:** every repo starts with README, CODEOWNERS, locked-down Actions permissions, and protected environments.
- **State management:** drift detection and lifecycle management via OpenTofu state.

## Architecture

```
              ┌─────────────────────────────────────────┐
              │            repo-synthesizer             │
              │        (infra/repo-synthesizer)         │
              └──────────────────┬──────────────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│    Repo Setup      │    │    Governance      │    │  Boilerplate Files │
├────────────────────┤    ├────────────────────┤    ├────────────────────┤
│ • Name & Scope     │    │ • Branch Rules     │    │ • README & License │
│ • Visibility       │    │ • Required Checks  │    │ • .gitignore       │
│ • Environments     │    │ • CODEOWNERS       │    │ • GitHub Workflows │
│ • Secrets & Vars   │    │ • Secret Scanning  │    │ • PR Templates     │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```

Composition order in `main.tf` matters and is preserved from the POC: `repository` → (`actions`, `repository_environments`, `repository_files`) → `repository_rulesets` (explicit `depends_on = [module.repository_files]`).

## Layout

```
infra/repo-synthesizer/
├── main.tf                      # module composition (runnable root)
├── variables.tf                 # repo_name, repo_description, repo_visibility, ...
├── outputs.tf                   # repo_id, clone URLs, default branch
├── providers.tf                 # tofu >= 1.8, integrations/github 6.13.0, owner var
├── terraform.tfvars.example     # copy to terraform.tfvars (gitignored)
├── .terraform.lock.hcl          # committed provider lock (keep in git)
├── README.md                    # this file
└── modules/
    ├── repository/              # github_repository + default branch (see README)
    ├── actions/                 # Actions + workflow permissions (see README)
    ├── repository-environments/ # staging / production / development (see README)
    ├── repository-files/        # README.md + CODEOWNERS bootstrap (see README)
    └── repository-rulesets/     # default-branch protection ruleset (see README)
```

## Relationship to hub-mason-engine

The `provision-repository` handler (`src/handlers/repository/provision-repository/`) produces the values this stack consumes:

| Engine request field | Tofu variable      | Notes                                   |
| -------------------- | ------------------ | --------------------------------------- |
| `name`               | `repo_name`        | `owner/repo` is `github_owner/repo_name` |
| `description`        | `repo_description` | also rendered into bootstrapped README  |
| `isPublic: boolean`  | `repo_visibility`  | `true` → `"public"`, `false` → `"private"` |
| `topics: string[]`   | `repo_topics`      | list of topics/tags                     |
| workflow `owner`     | `github_owner`     | provider owner + `code_owner` fallback  |

`planRepository` (`src/handlers/repository/provision-repository/provision.ts`) currently derives the plan from the request and only checks existence via `checkRepoExists`. Wiring `tofu plan -var-file=<request> -out=tfplan` here is the open TODO: generate a `.tfvars.json` from the validated request and run plan/apply against this root.

## Prerequisites

- OpenTofu `>= 1.8.0` (`tofu`, never `terraform`; tested with v1.13.1).
- `integrations/github` provider `6.13.0`, pinned in root `providers.tf` **and** every module's `providers.tf` — bump all together or `init` fails.
- `GITHUB_TOKEN` env var with permission to create/administer repos under `github_owner`. The `github` provider block only sets `owner`; the token comes from the environment.

## Usage

All commands run from this directory:

```bash
cd infra/repo-synthesizer

cp terraform.tfvars.example terraform.tfvars   # never commit real values
# edit terraform.tfvars: github_owner, repo_name, ...

tofu init
tofu validate
tofu plan -var-file="terraform.tfvars"
tofu apply -var-file="terraform.tfvars"
```

Minimal `terraform.tfvars`:

```hcl
github_owner = "your-github-username-or-org"
repo_name    = "example-repository"

repo_description = "Synthesized repository managed by OpenTofu"
repo_visibility  = "public" # "public", "private", or "internal"
repo_topics      = ["opentofu", "automation", "governance"]

code_owner                      = "" # defaults to github_owner
required_approving_review_count = 1

environment_reviewer_usernames = [] # e.g. ["octocat"]
environment_reviewer_teams     = [] # numeric team IDs, e.g. [1234567]
```

Generate vars from an engine request (JSON equivalent, `terraform.tfvars.json` also works):

```json
{
  "github_owner": "acme",
  "repo_name": "identity-service",
  "repo_description": "Hosts the identity service",
  "repo_visibility": "private",
  "repo_topics": ["go", "grpc"]
}
```

## Variables

| Name                              | Type           | Default | Description                                                        |
| --------------------------------- | -------------- | ------- | ------------------------------------------------------------------ |
| `github_owner`                    | `string`       | —       | GitHub org/user owning the repo (also provider owner).             |
| `repo_name`                       | `string`       | —       | Name of the repository to create.                                  |
| `repo_description`                | `string`       | `""`    | Repository description (also used in bootstrapped README).         |
| `repo_visibility`                 | `string`       | —       | `public`, `private`, or `internal`.                                |
| `repo_topics`                     | `list(string)` | `[]`    | Topics/tags applied to the repository.                             |
| `code_owner`                      | `string`       | `""`    | CODEOWNERS handle (no `@`); defaults to `github_owner`.            |
| `required_approving_review_count` | `number`       | `1`     | Approving reviews for default branch (may be `0` for solo work).   |
| `environment_reviewer_usernames`  | `list(string)` | `[]`    | Usernames allowed to approve protected-environment deployments.    |
| `environment_reviewer_teams`       | `list(number)` | `[]`    | Numeric team IDs allowed to approve protected-environment deploys. |

## Outputs

| Name                | Description                              |
| ------------------- | ---------------------------------------- |
| `repo_id`           | Numeric GitHub repository ID.            |
| `repo_name`         | Name of the synthesized repository.      |
| `repo_http_clone_url` | HTTPS clone URL.                       |
| `repo_ssh_clone_url`  | SSH clone URL.                         |
| `repo_default_branch` | Default branch (always `main`).        |

## Gotchas

- `internal` visibility only works for org-owned `github_owner`; it fails on personal accounts.
- `*.tfstate`, `*.tfvars`, `*.tfvars.json`, `.terraform/` are gitignored but may exist locally — never `git add -f` them. Commit `.terraform.lock.hcl`.
- Each `tofu apply` creates a real GitHub repo — side-effectful. Prefer `plan`; confirm `repo_name`/`github_owner` before apply.
- Downstream modules consume `module.repository.repo_name` / `repo_default_branch` outputs — pass outputs, not `var.repo_name`, when wiring new modules.

## License

Distributed under the MIT License. See LICENSE for more information.
