resource "hcloud_firewall" "default" {
  name   = "salko_firewall"
  labels = {}

  rule {
    description     = "Allow all TCP from private network"
    destination_ips = []
    direction       = "in"
    protocol        = "tcp"
    source_ips = [
      var.network_cidr,
    ]
  }

  rule {
    description     = "Allow all UDP from private network"
    destination_ips = []
    direction       = "in"
    protocol        = "udp"
    source_ips = [
      var.network_cidr,
    ]
  }

  rule {
    description     = "Allow ICMP from private network"
    destination_ips = []
    direction       = "in"
    protocol        = "icmp"
    source_ips = [
      var.network_cidr,
    ]
  }

  rule {
    description     = "Allow HTTP from anywhere"
    destination_ips = []
    direction       = "in"
    port            = "80"
    protocol        = "tcp"
    source_ips = [
      "0.0.0.0/0",
    ]
  }

  rule {
    description     = "Allow HTTPS from anywhere"
    destination_ips = []
    direction       = "in"
    port            = "443"
    protocol        = "tcp"
    source_ips = [
      "0.0.0.0/0",
    ]
  }
}
