output "server_private_ips" {
  description = "Map of server names to their private IPs (for private network routing)"
  value       = { for instance in hcloud_server.salko : instance.name => one(instance.network).ip }
}

output "server_public_ips" {
  description = "Map of server names to their public IPv4 addresses (for DNS and public access)"
  value       = { for instance in hcloud_server.salko : instance.name => instance.ipv4_address }
}
