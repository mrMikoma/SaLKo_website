#################################################################
# Hetzner Cloud
#################################################################

resource "hcloud_network" "network" {
  name     = "salko-network"
  ip_range = var.network_cidr
}

module "salko" {
  source = "./modules/hetzner"

  location           = var.location
  instances          = var.instances
  server_type        = var.server_type
  os_type            = var.os_type
  vps_ssh_public_key = var.vps_ssh_public_key

  network_id            = hcloud_network.network.id
  private_subnet        = var.private_subnet
  private_subnet_prefix = var.private_subnet_prefix

  depends_on = [
    hcloud_network.network
  ]
}

#################################################################
# Cloudflare
#################################################################

# data "cloudflare_zones" "main" {
#   filter {
#     name = var.cloudflare_zone_name
#   }
# }

# TO-DO: Create a Cloudflare API token with permissions to manage DNS records for traefik

# resource "cloudflare_record" "root" {
#   zone_id = data.cloudflare_zones.main.zones[0].id
#   name    = "@"
#   type    = "A"
#   value   = "YOUR_VPS_PUBLIC_IP"
#   ttl     = 120
#   proxied = true
# }

# resource "cloudflare_record" "www" {
#   zone_id = data.cloudflare_zones.main.zones[0].id
#   name    = "www"
#   type    = "CNAME"
#   value   = "@"
#   ttl     = 120
#   proxied = true
# 
#   depends_on = [
#     data.cloudflare_zones.main
#   ]
# }

#################################################################
# GitHub
#################################################################

resource "github_actions_variable" "server_ips" {
  for_each      = tomap(module.salko.server_ips)
  repository    = var.github_repository
  variable_name = upper(format("server_ip_%s", each.key))
  value         = each.value

  depends_on = [
    module.salko
  ]
}

resource "github_actions_secret" "cf_dns_api_token" {
  repository      = var.github_repository
  secret_name     = "CF_DNS_API_TOKEN"
  plaintext_value = cloudflare_api_token.traefik.value

  depends_on = [
    cloudflare_api_token.traefik
  ]
}
