// General

// Hetzner Cloud

variable "hetzner_api_token" {
  description = "Hetzner Cloud API token for the salko"
  type        = string
  sensitive   = true
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
  default     = "cx22"
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
  default     = "10.101.0.0/24"
}

variable "private_subnet_prefix" {
  description = "Private subnet prefix for the salko"
  type        = string
  default     = "10.101.0."
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

// GitHub

variable "github_token" {
  description = "GitHub API token for the salko"
  type        = string
  sensitive   = true
}
