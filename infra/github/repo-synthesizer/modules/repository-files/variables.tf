variable "name" {
  type        = string
  description = "The name of the repository to create files in."
}

variable "description" {
  type        = string
  default     = ""
  description = "The description of the repository to populate inside README.md."
}

variable "code_owner" {
  type        = string
  description = "The GitHub username or team handle (without leading @) responsible for CODEOWNERS. Must not be empty."

  validation {
    condition     = length(trimspace(var.code_owner)) > 0
    error_message = "The code_owner variable must not be empty."
  }
}

variable "default_branch" {
  type        = string
  default     = "main"
  description = "The default branch where boilerplate files should be committed."
}
