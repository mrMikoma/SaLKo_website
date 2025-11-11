output "server_private_ips" {
  description = "Map of server names to their private IPs (for private network routing)"
  value       = module.salko.server_private_ips
}

output "server_public_ips" {
  description = "Map of server names to their public IPv4 addresses (for DNS and public access)"
  value       = module.salko.server_public_ips
}
