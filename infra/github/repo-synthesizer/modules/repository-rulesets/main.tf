resource "github_repository_ruleset" "protected_branch_rules" {
  name        = "protected-branch-rules"
  repository  = var.repository_name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion = true

    non_fast_forward = true

    pull_request {
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = true
      required_approving_review_count   = var.required_approving_review_count
      required_review_thread_resolution = true

      allowed_merge_methods = [
        "merge",
        "squash",
        "rebase"
      ]
    }
  }
}