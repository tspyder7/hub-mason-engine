data "github_user" "reviewer" {
  for_each = toset(var.reviewer_usernames)

  username = each.value
}

resource "github_repository_environment" "repository_environment" {
  for_each = local.environments

  environment = each.key
  repository  = var.repository_name

  prevent_self_review = each.value.prevent_self_review

  dynamic "reviewers" {
    for_each = each.value.reviewers_enabled ? [1] : []

    content {
      users = local.reviewer_users
      teams = var.reviewer_teams
    }
  }

  dynamic "deployment_branch_policy" {
    for_each = (each.value.protected_branches || each.value.custom_branch_policies) ? [1] : []

    content {
      protected_branches     = each.value.protected_branches
      custom_branch_policies = each.value.custom_branch_policies
    }
  }
}
