variable "instances" {
  description = "Number of instances to create"
  type        = number
}

variable "location" {
  description = "Location to deploy the server"
  type        = string
}

variable "server_type" {
  description = "Server type to deploy"
  type        = string
}

variable "os_type" {
  description = "Operating system to deploy"
  type        = string
}

variable "network_id" {
  description = "Network ID"
  type        = number
}

variable "network_cidr" {
  description = "Network CIDR"
  type        = string
}

variable "private_subnet" {
  description = "Private subnet"
  type        = string
}

variable "private_subnet_prefix" {
  description = "Private subnet prefix"
  type        = string
}

variable "vps_ssh_public_key" {
  description = "SSH public key for the VPS"
  type        = string
}

variable "private_gateway_ip" {
  description = "Private gateway IP address for routing private network traffic (NOT default gateway 10.1.0.1)"
  type        = string
}

variable "hetzner_gha_runner_ssh_key_id" {
  description = "SSH key ID for GitHub Actions runner access"
  type        = number
}

# Cloudflare's IPv4 ranges (https://www.cloudflare.com/ips-v4, also
# https://api.cloudflare.com/client/v4/ips), checked 2026-10-30. Every public
# hostname is proxied through Cloudflare, so the web ports accept only these:
# a visitor who reached the origin directly could set CF-Connecting-IP, the
# address the site's rate limits count by. Update when Cloudflare adds ranges.
variable "cloudflare_ipv4_ranges" {
  description = "Cloudflare's IPv4 ranges, the only sources for ports 80 and 443"
  type        = list(string)
  default = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
}
