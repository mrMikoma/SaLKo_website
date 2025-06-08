variable "instances" {
  description = "Number of instances to create"
  type        = number
}

variable "location" {
  description = "Location to deploy the server"
  type        = string
}

variable "server_type" {
  description = "Server type to deploy"
  type        = string
}

variable "os_type" {
  description = "Operating system to deploy"
  type        = string
}

variable "network_id" {
  description = "Network ID"
  type        = string
}

variable "private_subnet" {
  description = "Private subnet"
  type        = string
}

variable "private_subnet_prefix" {
  description = "Private subnet prefix"
  type        = string
}

variable "vps_ssh_public_key" {
  description = "SSH public key for the VPS"
  type        = string
}
