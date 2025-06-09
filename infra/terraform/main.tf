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



#################################################################
# GitHub
#################################################################

resource "github_actions_variable" "server_ip_salko_0" {
  for_each     = tomap(module.salko.server_ips)
  repository   = "SaLKo_website"
  variable_name = format("server_ip_%s", each.key)
  value         = each.value
  depends_on    = [module.salko]
}
