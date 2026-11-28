terraform {
  required_version = ">= 1.15.0, < 1.17.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.70.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13.0"
    }
    # Held below 5.26: 5.26.0+ plans a spurious update on every existing
    # cloudflare_dns_record (cloudflare/terraform-provider-cloudflare#7387).
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.25.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9.0"
    }
    # Writes Terraform's own values into Bitwarden Secrets Manager
    bitwarden-secrets = {
      source  = "bitwarden/bitwarden-secrets"
      version = "~> 1.0.1"
    }
  }

  backend "s3" {
    bucket = "salko-website"
    key    = "terraform.tfstate"
    region = "auto"

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true

    endpoints = {
      s3 = "https://b60de3b655609a784e6dff508195806d.r2.cloudflarestorage.com"
    }
  }
}

provider "hcloud" {
  token = var.hetzner_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

# Bitwarden's US cloud, like the workflows' sm-action (region us). The
# machine account's token and the organization come from BW_ACCESS_TOKEN and
# BW_ORGANIZATION_ID (terraform-plan-and-apply.yaml).
provider "bitwarden-secrets" {
  api_url      = "https://api.bitwarden.com"
  identity_url = "https://identity.bitwarden.com"
}

provider "github" {
  owner = var.github_main_username
  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    # The key as it is (Bitwarden Secrets Manager, which the auto-merge
    # workflow reads too), or base64-encoded (the GitHub secret)
    pem_file = startswith(var.github_app_private_key_pem, "-----BEGIN") ? var.github_app_private_key_pem : base64decode(var.github_app_private_key_pem)
  }
}
