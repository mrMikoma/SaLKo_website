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
  enforce_admins   = true
  allows_deletions = false

  required_pull_request_reviews {
    require_code_owner_reviews      = true
    dismiss_stale_reviews           = true
    required_approving_review_count = 1
  }
}

# Development branch protection
resource "github_branch_protection" "dev" {
  repository_id = var.github_repository

  pattern          = "dev"
  enforce_admins   = true
  allows_deletions = false

  required_pull_request_reviews {
    require_code_owner_reviews      = true
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
  can_admins_bypass   = true
  prevent_self_review = false

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

#################################################################
# Global Variables
#################################################################


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
