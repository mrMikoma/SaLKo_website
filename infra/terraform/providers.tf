terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.45.0"
    }
  }
}

provider "hcloud" {
  token = var.TF_VAR_hetzner_api_token
}
