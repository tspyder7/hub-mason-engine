variable "repository_name" {
  type        = string
  description = "The name of the repository to configure environments for."
}

variable "reviewer_usernames" {
  type        = list(string)
  default     = []
  description = "List of GitHub usernames allowed to review deployment jobs for protected environments."
}

variable "reviewer_users" {
  type        = list(number)
  default     = []
  description = "List of numeric GitHub user IDs allowed to review deployment jobs for protected environments."
}

variable "reviewer_teams" {
  type        = list(number)
  default     = []
  description = "List of numeric GitHub team IDs allowed to review deployment jobs for protected environments."
}