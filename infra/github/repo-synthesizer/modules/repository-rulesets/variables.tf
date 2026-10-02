variable "repository_name" {
  type        = string
  description = "Name of the repository where the branch ruleset will be applied."
}

variable "required_approving_review_count" {
  type        = number
  default     = 1
  description = "The number of approving reviews required before merging pull requests (can be 0)."
}