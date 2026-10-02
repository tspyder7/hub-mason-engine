output "repo_id" {
  description = "The numeric GitHub repository ID."
  value       = github_repository.repository.repo_id
}

output "repo_name" {
  description = "The name of the GitHub repository."
  value       = github_repository.repository.name
}

output "repo_http_clone_url" {
  description = "The HTTPS clone URL of the repository."
  value       = github_repository.repository.http_clone_url
}

output "repo_default_branch" {
  description = "The default branch of the repository."
  value       = github_branch_default.default.branch
}

output "repo_ssh_clone_url" {
  description = "The SSH clone URL of the repository."
  value       = github_repository.repository.ssh_clone_url
}
