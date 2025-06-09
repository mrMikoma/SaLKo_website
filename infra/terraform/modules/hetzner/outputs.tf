output "server_ips" {
  description = "List of server names and their IPs"
  value       = { for instance in hcloud_server.salko : instance.name => instance.ipv4_address }
}
