output "server_ips" {
  description = "List of server names and their private IPs"
  value       = { for instance in hcloud_server.salko : instance.name => one(instance.network).ip }
}
