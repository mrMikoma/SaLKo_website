terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.51.0"
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.5.0"
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
      s3 = var.state_bucket_endpoint
    }
  }
}

provider "hcloud" {
  token = var.hetzner_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

provider "github" {
  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_private_key_pem
  }
}
