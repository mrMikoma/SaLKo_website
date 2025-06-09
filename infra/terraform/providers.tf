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

provider "github" {
  token = var.github_token
}
