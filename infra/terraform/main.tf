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

data "cloudflare_zones" "main" {
  filter {
    name   = var.cloudflare_zone_name
  }
}

## TO-DO: Create and store the Cloudflare API token in a secure way

# resource "cloudflare_record" "root" {
#   zone_id = data.cloudflare_zones.main.zones[0].id
#   name    = "@"
#   type    = "A"
#   value   = "YOUR_VPS_PUBLIC_IP"
#   ttl     = 120
#   proxied = true
# }

#################################################################
# GitHub
#################################################################

resource "github_actions_variable" "server_ips" {
  for_each      = tomap(module.salko.server_ips)
  repository    = "SaLKo_website"
  variable_name = upper(format("server_ip_%s", each.key))
  value         = each.value

  depends_on = [
    module.salko
  ]
}
