resource "hcloud_firewall" "default" {
  name   = "salko_firewall"
  labels = {}

  # rule {
  #   description     = "SSH"
  #   destination_ips = []
  #   direction       = "in"
  #   port            = "22"
  #   protocol        = "tcp"
  #   source_ips = [
  #     "0.0.0.0/0",
  #   ]
  # }

  rule {
    description     = "proxy"
    destination_ips = []
    direction       = "in"
    port            = "80"
    protocol        = "tcp"
    source_ips = [
      "0.0.0.0/0",
    ]
  }

  rule {
    description     = "proxy"
    destination_ips = []
    direction       = "in"
    port            = "443"
    protocol        = "tcp"
    source_ips = [
      "0.0.0.0/0",
    ]
  }
}
