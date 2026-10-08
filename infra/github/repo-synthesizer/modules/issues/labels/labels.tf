locals {
  labels = [
    {
      name        = "app:${lower(var.repository_name)}"
      description = "Related to ${lower(var.repository_name)}"
      color       = "1d76db"
    },
    {
      name        = "type:feature"
      description = "Net-new capability not previously available"
      color       = "0052cc"
    },
    {
      name        = "type:bug"
      description = "Confirmed defect in production behavior"
      color       = "d73a4a"
    },
    {
      name        = "type:hotfix"
      description = "Urgent fix for a critical issue"
      color       = "b60205"
    },
    {
      name        = "type:enhancement"
      description = "Improvement to existing capability, no new feature"
      color       = "0969da"
    },
    {
      name        = "type:refactor"
      description = "Code restructuring without changing behavior"
      color       = "5319e7"
    },
    {
      name        = "type:chore"
      description = "Maintenance or housekeeping changes"
      color       = "6e7681"
    },
    {
      name        = "type:docs"
      description = "Documentation changes"
      color       = "0075ca"
    },
    {
      name        = "type:test"
      description = "Changes related to tests or test coverage"
      color       = "9a6700"
    },
    {
      name        = "type:ci"
      description = "Continuous integration and automation changes"
      color       = "087990"
    },
    {
      name        = "type:build"
      description = "Build system or tooling changes"
      color       = "7057ff"
    },
    {
      name        = "type:dependencies"
      description = "Dependency updates or changes"
      color       = "0366d6"
    },
    {
      name        = "type:security"
      description = "Security-related changes or fixes"
      color       = "82071e"
    },
    {
      name        = "type:performance"
      description = "Performance or efficiency improvements"
      color       = "e36d00"
    },
    {
      name        = "type:style"
      description = "Code style or formatting changes"
      color       = "59636e"
    },
    {
      name        = "status:draft"
      description = "Work is still in draft or initial development"
      color       = "57606a"
    },
    {
      name        = "status:ready-for-review"
      description = "Ready for code review"
      color       = "1f883d"
    },
    {
      name        = "status:in-review"
      description = "Currently under code review"
      color       = "fbca04"
    },
    {
      name        = "status:changes-requested"
      description = "Changes have been requested during review"
      color       = "d93f0b"
    },
    {
      name        = "status:approved"
      description = "Changes have been approved"
      color       = "0e8a16"
    },
    {
      name        = "status:blocked"
      description = "Work is blocked by an issue or dependency"
      color       = "cf222e"
    },
    {
      name        = "status:ready-to-merge"
      description = "Approved and ready to be merged"
      color       = "8250df"
    },
    {
      name        = "status:merge-conflict"
      description = "Pull request has merge conflicts"
      color       = "a40e26"
    },
    {
      name        = "priority:critical"
      description = "Critical priority requiring immediate attention",
      color       = "8b0000"
    },
    {
      name        = "priority:high"
      description = "High priority work",
      color       = "e5534b"
    },
    {
      name        = "priority:medium"
      description = "Medium priority work",
      color       = "c69000"
    },
    {
      name        = "priority:low"
      description = "Low priority work",
      color       = "2da44e"
    },
    {
      name        = "size:xs"
      description = "Extra-small pull request with 1-5 changed files"
      color       = "0a3069"
    },
    {
      name        = "size:s"
      description = "Small pull request with 6-20 changed files"
      color       = "2188ff"
    },
    {
      name        = "size:m"
      description = "Medium pull request with 21-50 changed files"
      color       = "54aeff"
    },
    {
      name        = "size:l"
      description = "Large pull request with 51-100 changed files"
      color       = "ff7b72"
    },
    {
      name        = "size:xl"
      description = "Extra-large pull request with more than 100 changed files"
      color       = "5c0a0a"
    }
  ]
}
