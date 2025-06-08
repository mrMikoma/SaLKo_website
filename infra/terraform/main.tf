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
  vps_ssh_public_key = var.TF_VAR_vps_ssh_public_key

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

