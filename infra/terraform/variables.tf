// General

// Hetzner Cloud

variable "hetzner_api_token" {
  description = "Hetzner Cloud API token for the salko"
  type        = string
  sensitive   = true
}

variable "hetzner_network_id" {
  description = "Hetzner Cloud Network ID for the salko"
  type        = number
}

variable "instances" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}

variable "location" {
  description = "Location to deploy the server"
  type        = string
  default     = "hel1"
}

variable "server_type" {
  description = "Server type to deploy"
  type        = string
  default     = "cx23"
}

variable "os_type" {
  description = "Operating system to deploy"
  type        = string
  default     = "ubuntu-24.04"
}

variable "network_cidr" {
  description = "Network CIDR for the salko"
  type        = string
  default     = "10.101.0.0/16"
}

variable "private_subnet" {
  description = "Private subnet for the salko"
  type        = string
  default     = "10.1.1.0/24"
}

variable "private_subnet_prefix" {
  description = "Private subnet prefix for the salko"
  type        = string
  default     = "10.1.1."
}

variable "vps_ssh_public_key" {
  description = "SSH public key for the VPS"
  type        = string
}

// Cloudflare

variable "cloudflare_token" {
  description = "Cloudflare API token for the salko"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the salko"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_name" {
  description = "Cloudflare zone name for the salko"
  type        = string
  default     = "savonlinnanlentokerho.fi"
}

// GitHub

variable "github_app_id" {
  description = "GitHub App ID for Terraform authentication"
  type        = string
}

variable "github_app_installation_id" {
  description = "GitHub App Installation ID"
  type        = string
}

variable "github_app_private_key_pem" {
  description = "Path to GitHub App private key file"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository for the salko"
  type        = string
  default     = "SaLKo_website"
}

variable "github_main_username" {
  description = "GitHub main user for the salko"
  type        = string
  default     = "mrMikoma"
}
