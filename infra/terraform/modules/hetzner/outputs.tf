output "server_ips" {
  description = "List of server IPs"
  value       = [for instance in hcloud_server.salko : instance.network]
}
