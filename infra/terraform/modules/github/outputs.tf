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
