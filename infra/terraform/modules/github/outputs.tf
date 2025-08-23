output "development_environment" {
  description = "Development environment details"
  value = {
    name = github_repository_environment.development.environment
    id   = github_repository_environment.development.id
  }
}

output "production_environment" {
  description = "Production environment details"
  value = {
    name = github_repository_environment.production.environment
    id   = github_repository_environment.production.id
  }
}

output "server_ip_variables" {
  description = "Created GitHub Actions variables for server IPs"
  value       = { for k, v in github_actions_variable.server_ips : k => v.variable_name }
}