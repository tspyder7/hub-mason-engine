module "repository" {
  source = "./modules/repository"

  name        = var.repo_name
  description = var.repo_description
  topics      = var.repo_topics
  visibility  = var.repo_visibility
}

module "actions" {
  source = "./modules/actions"

  name = module.repository.repo_name
}

module "repository_environments" {
  source = "./modules/repository-environments"

  repository_name    = module.repository.repo_name
  reviewer_usernames = var.environment_reviewer_usernames
  reviewer_teams     = var.environment_reviewer_teams

  depends_on = [module.repository]
}

module "repository_files" {
  source = "./modules/repository-files"

  name           = module.repository.repo_name
  description    = var.repo_description
  code_owner     = var.code_owner != "" ? var.code_owner : var.github_owner
  default_branch = module.repository.repo_default_branch

  depends_on = [module.repository]
}

module "repository_rulesets" {
  source = "./modules/repository-rulesets"

  repository_name                 = module.repository.repo_name
  required_approving_review_count = var.required_approving_review_count

  depends_on = [module.repository_files]
}
