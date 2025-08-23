variable "github_repository" {
  description = "GitHub repository name"
  type        = string
}

variable "server_ips" {
  description = "Map of server names to IP addresses"
  type        = map(string)
}

variable "github_main_username" {
  description = "GitHub main user for the salko"
  type        = string
}