terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = ">= 6.6.0"
    }
    bitwarden-secrets = {
      source  = "bitwarden/bitwarden-secrets"
      version = ">= 1.0.1"
    }
  }
}
