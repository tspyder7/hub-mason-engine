locals {
  environments = {
    production = {
      prevent_self_review    = false
      protected_branches     = true
      custom_branch_policies = false
      reviewers_enabled      = true
    }

    staging = {
      prevent_self_review    = false
      protected_branches     = true
      custom_branch_policies = false
      reviewers_enabled      = true
    }

    development = {
      prevent_self_review    = false
      protected_branches     = false
      custom_branch_policies = false
      reviewers_enabled      = false
    }
  }

  reviewer_users = concat(
    [for u in data.github_user.reviewer : u.id],
    var.reviewer_users
  )
}
