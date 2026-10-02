variable "github_owner" {
  type        = string
  description = "The GitHub organization or user account owner of the repository."

  validation {
    condition     = length(trimspace(var.github_owner)) > 0
    error_message = "The github_owner variable must not be empty."
  }
}

variable "repo_name" {
  type        = string
  description = "The name of the GitHub repository to create."

  validation {
    condition     = length(trimspace(var.repo_name)) > 0
    error_message = "The repo_name variable must not be empty."
  }
}

variable "repo_description" {
  type        = string
  default     = ""
  description = "A description of the GitHub repository."
}

variable "repo_visibility" {
  type        = string
  description = "The visibility of the repository (public, private, or internal)."

  validation {
    condition     = contains(["public", "private", "internal"], var.repo_visibility)
    error_message = "repo_visibility must be 'public', 'private', or 'internal'."
  }
}

variable "repo_topics" {
  type        = list(string)
  default     = []
  description = "A list of topics/tags to apply to the repository."
}

variable "code_owner" {
  type        = string
  default     = ""
  description = "The GitHub username or team handle (without leading @) for CODEOWNERS. If omitted, defaults to github_owner."
}

variable "required_approving_review_count" {
  type        = number
  default     = 1
  description = "Number of approving reviews required before merging pull requests into the default branch (can be 0 for solo/personal development)."
}

variable "environment_reviewer_usernames" {
  type        = list(string)
  default     = []
  description = "List of GitHub usernames allowed to review deployment jobs for protected environments."
}

variable "environment_reviewer_teams" {
  type        = list(number)
  default     = []
  description = "List of numeric GitHub team IDs allowed to review deployment jobs for protected environments."
}
