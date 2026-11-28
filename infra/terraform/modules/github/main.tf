data "github_user" "main_user" {
  username = var.github_main_username
}

#################################################################
# Protected Branches
#################################################################

# Production branch protection
resource "github_branch_protection" "main" {
  repository_id = var.github_repository

  pattern          = "main"
  enforce_admins   = false
  allows_deletions = false

  required_pull_request_reviews {
    require_code_owner_reviews      = true
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }
}

# Development branch protection. Dependabot's minor and patch updates merge
# by themselves (.github/workflows/dependabot-auto-merge.yaml): the GitHub
# App gives the one approval, which a Code Owners review would not accept,
# and branches need not be up to date, because Dependabot rebases only on
# conflicts. ci-ok (checks.yaml) must pass.
resource "github_branch_protection" "dev" {
  repository_id = var.github_repository

  pattern          = "dev"
  enforce_admins   = false
  allows_deletions = false

  required_status_checks {
    strict   = false
    contexts = ["ci-ok"]
  }

  required_pull_request_reviews {
    require_code_owner_reviews      = false
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }
}

#################################################################
# Environments
#################################################################

resource "github_repository_environment" "development" {
  environment         = "development"
  repository          = var.github_repository
  can_admins_bypass   = true
  prevent_self_review = false

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "production" {
  environment         = "production"
  repository          = var.github_repository
  wait_timer          = 0
  can_admins_bypass   = false
  prevent_self_review = false

  reviewers {
    users = [data.github_user.main_user.id]
  }

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

#################################################################
# Global Variables
#################################################################

# The workflows read their secrets from Bitwarden Secrets Manager. Terraform
# writes the ones it makes itself there, and each one's id into the
# environment as the variable BWS_ID_<name>, for the workflows' sm-action.
data "bitwarden-secrets_projects" "all" {}

locals {
  bws_project_ids = { for p in data.bitwarden-secrets_projects.all.projects : p.name => p.id }
}


#################################################################
# Development Variables and Secrets
#################################################################

resource "random_password" "dev_postgres_password" {
  length           = 32
  special          = true
  override_special = "_%@"
}

resource "github_actions_environment_secret" "dev_postgres_password" {
  environment     = github_repository_environment.development.environment
  repository      = var.github_repository
  secret_name     = "POSTGRES_PASSWORD"
  plaintext_value = random_password.dev_postgres_password.result
}

# The same value as the GitHub secret above, which stays until the workflows
# read this one
resource "bitwarden-secrets_secret" "dev_postgres_password" {
  key        = "POSTGRES_PASSWORD"
  value      = random_password.dev_postgres_password.result
  project_id = local.bws_project_ids["salko-dev"]
  note       = "Terraform writes this (infra/terraform/modules/github, random_password.dev_postgres_password). A change made here is not undone by Terraform and does not reach the database."
}

resource "github_actions_environment_variable" "dev_bws_id_postgres_password" {
  environment   = github_repository_environment.development.environment
  repository    = var.github_repository
  variable_name = "BWS_ID_POSTGRES_PASSWORD"
  value         = bitwarden-secrets_secret.dev_postgres_password.id
}

##################################################################
# Production Variables and Secrets
#################################################################

resource "random_password" "prod_postgres_password" {
  length           = 32
  special          = true
  override_special = "_%@"
}

resource "github_actions_environment_secret" "prod_postgres_password" {
  environment     = github_repository_environment.production.environment
  repository      = var.github_repository
  secret_name     = "POSTGRES_PASSWORD"
  plaintext_value = random_password.prod_postgres_password.result
}

# The same value as the GitHub secret above, which stays until the workflows
# read this one
resource "bitwarden-secrets_secret" "prod_postgres_password" {
  key        = "POSTGRES_PASSWORD"
  value      = random_password.prod_postgres_password.result
  project_id = local.bws_project_ids["salko-prod"]
  note       = "Terraform writes this (infra/terraform/modules/github, random_password.prod_postgres_password). A change made here is not undone by Terraform and does not reach the database."
}

resource "github_actions_environment_variable" "prod_bws_id_postgres_password" {
  environment   = github_repository_environment.production.environment
  repository    = var.github_repository
  variable_name = "BWS_ID_POSTGRES_PASSWORD"
  value         = bitwarden-secrets_secret.prod_postgres_password.id
}
