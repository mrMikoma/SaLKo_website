terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.51.0"
    }
  }

  backend "s3" {
    bucket = "salko-website"
    key    = "terraform.tfstate"
    region = "eu-central"
    endpoints = {
      s3 = "https://hel1.your-objectstorage.com"
    }
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    use_path_style              = true
    skip_s3_checksum            = true
    skip_requesting_account_id  = true
  }
}

provider "hcloud" {
  token = var.hetzner_api_token
}
