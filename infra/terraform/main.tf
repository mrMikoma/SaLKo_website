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

resource "github_actions_variable" "server-ip-salko-0" {
  count = module.salko.server_ips["salko-0"] != "" ? 1 : 0
  repository    = "SaLKo_website"
  variable_name = format("server-ip-%s", "salko-0")
  value         = module.salko.server_ips["salko-0"]
  depends_on    = [module.salko]
}
