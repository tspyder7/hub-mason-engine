resource "github_repository" "repository" {
  name        = var.name
  visibility  = var.visibility
  description = var.description
  topics      = var.topics

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = false

  auto_init = true
}

resource "github_branch_default" "default" {
  repository = github_repository.repository.name
  branch     = "main"
}
