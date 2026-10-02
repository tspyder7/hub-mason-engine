data "github_user" "reviewer" {
  for_each = toset(var.reviewer_usernames)

  username = each.value
}

resource "github_repository_environment" "repository_environment" {
  for_each = local.environments

  environment = each.key
  repository  = var.repository_name

  prevent_self_review = each.value.prevent_self_review

  reviewers {
    users = each.value.reviewers_enabled ? local.reviewer_users : []
    teams = each.value.reviewers_enabled ? var.reviewer_teams : []
  }

  deployment_branch_policy {
    protected_branches     = each.value.protected_branches
    custom_branch_policies = each.value.custom_branch_policies
  }
}
