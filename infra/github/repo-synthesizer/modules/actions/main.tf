resource "github_actions_repository_permissions" "this" {
  repository      = var.name
  allowed_actions = "all"
}

resource "github_workflow_repository_permissions" "this" {
  repository                       = var.name
  default_workflow_permissions     = "read"
  can_approve_pull_request_reviews = false
}