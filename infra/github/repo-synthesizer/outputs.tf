output "repo_id" {
  description = "The numeric GitHub repository ID."
  value       = module.repository.repo_id
}

output "repo_name" {
  description = "The name of the synthesized GitHub repository."
  value       = module.repository.repo_name
}

output "repo_http_clone_url" {
  description = "The HTTPS clone URL of the repository."
  value       = module.repository.repo_http_clone_url
}

output "repo_ssh_clone_url" {
  description = "The SSH clone URL of the repository."
  value       = module.repository.repo_ssh_clone_url
}

output "repo_default_branch" {
  description = "The default branch of the repository."
  value       = module.repository.repo_default_branch
}
