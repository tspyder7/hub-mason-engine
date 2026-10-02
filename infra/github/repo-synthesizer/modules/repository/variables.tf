variable "name" {
  type        = string
  description = "The name of the GitHub repository."
}

variable "description" {
  type        = string
  default     = ""
  description = "A description of the repository."
}

variable "visibility" {
  type        = string
  description = "The visibility of the repository (public, private, or internal)."

  validation {
    condition     = contains(["public", "private", "internal"], var.visibility)
    error_message = "Visibility must be 'public', 'private', or 'internal'."
  }
}

variable "topics" {
  type        = list(string)
  default     = []
  description = "The list of topics to apply to the repository."
}
