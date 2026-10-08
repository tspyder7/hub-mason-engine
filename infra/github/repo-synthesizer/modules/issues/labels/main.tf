resource "github_issue_labels" "labels" {
  repository = var.repository_name

  dynamic "label" {
    for_each = local.labels
    content {
      name        = label.value.name
      color       = label.value.color
      description = label.value.description
    }
  }
}
