resource "github_repository_file" "readme" {
  repository          = var.name
  branch              = var.default_branch
  file                = "README.md"
  content             = <<-EOT
    # ${var.name}

    ${var.description}
  EOT
  commit_message      = "chore: add README"
  overwrite_on_create = true
}

resource "github_repository_file" "codeowners" {
  repository          = var.name
  branch              = var.default_branch
  file                = ".github/CODEOWNERS"
  content             = "* @${var.code_owner}\n"
  commit_message      = "chore: add CODEOWNERS"
  overwrite_on_create = true
}
