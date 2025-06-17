terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = ">= 1.45.0"
    }
  }
}

resource "hcloud_ssh_key" "vps_ssh_key" {
  name       = "salko_key"
  public_key = var.vps_ssh_public_key
}

resource "hcloud_network_subnet" "salko_subnet" {
  type         = "cloud"
  network_id   = var.network_id
  network_zone = "eu-central"
  ip_range     = var.private_subnet
}

resource "hcloud_server" "salko" {
  count       = var.instances
  name        = "salko${count.index}"
  image       = var.os_type
  server_type = var.server_type
  location    = var.location

  ssh_keys     = [hcloud_ssh_key.vps_ssh_key.id]
  firewall_ids = [hcloud_firewall.default.id]

  backups = false

  delete_protection  = true
  rebuild_protection = true

  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }

  network {
    network_id = var.network_id
    ip         = format("%s%d", var.private_subnet_prefix, count.index + 2)
  }

  lifecycle {
    ignore_changes = [ssh_keys]
  }

  depends_on = [
    hcloud_network_subnet.salko_subnet
  ]

  labels = {
    type = "salko"
  }
}
