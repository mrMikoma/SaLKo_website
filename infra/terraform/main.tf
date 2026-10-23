#################################################################
# Hetzner Cloud
#################################################################

# resource "hcloud_network" "network" {
#   name     = "salko-network"
#   ip_range = var.network_cidr
# }

module "salko" {
  source = "./modules/hetzner"

  location                      = var.location
  instances                     = var.instances
  server_type                   = var.server_type
  os_type                       = var.os_type
  vps_ssh_public_key            = var.vps_ssh_public_key
  hetzner_gha_runner_ssh_key_id = var.hetzner_gha_runner_ssh_key_id

  network_id            = var.hetzner_network_id
  network_cidr          = var.network_cidr
  private_subnet        = var.private_subnet
  private_subnet_prefix = var.private_subnet_prefix
  private_gateway_ip    = var.private_gateway_ip

  #  depends_on = [
  #    hcloud_network.network
  #  ]
}

#################################################################
# Cloudflare
#################################################################

resource "cloudflare_dns_record" "root" {
  zone_id = var.cloudflare_zone_id
  comment = "Apex domain"
  content = module.salko.server_public_ips["salko0"]
  name    = "@"
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "www" {
  zone_id = var.cloudflare_zone_id
  comment = "WWW subdomain"
  content = module.salko.server_public_ips["salko0"]
  name    = "www"
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "dev" {
  zone_id = var.cloudflare_zone_id
  comment = "Salko development 'kehitys' environment"
  content = module.salko.server_public_ips["salko0"]
  name    = "kehitys"
  type    = "A"
  ttl     = 1
  proxied = true
}

# Mail. The club's mail is Google Workspace; its MX record was added by hand.
# SPF and DMARC tell receivers that the domain's mail comes only from Google,
# so the bills the website sends (nextjs/docs/MAIL_SETUP.md) aren't taken for
# spam. The DKIM key (google._domainkey) comes from the Google Admin console
# and is added here once generated.

resource "cloudflare_dns_record" "spf" {
  zone_id = var.cloudflare_zone_id
  comment = "SPF: the domain's mail is sent only through Google Workspace"
  content = "\"v=spf1 include:_spf.google.com ~all\""
  name    = "@"
  type    = "TXT"
  ttl     = 1
}

# p=none: receivers check the domain's mail but don't act on failures yet.
# Raise to quarantine once DKIM is on and mail from Google passes.
resource "cloudflare_dns_record" "dmarc" {
  zone_id = var.cloudflare_zone_id
  comment = "DMARC for mail from the domain"
  content = "\"v=DMARC1; p=none\""
  name    = "_dmarc"
  type    = "TXT"
  ttl     = 1
}

#################################################################
# GitHub
#################################################################

module "github" {
  source = "./modules/github"

  github_repository    = var.github_repository
  github_main_username = var.github_main_username
}

resource "github_actions_variable" "server_ips" {
  for_each      = tomap(module.salko.server_private_ips)
  repository    = var.github_repository
  variable_name = upper(format("server_ip_%s", each.key))
  value         = each.value

  depends_on = [
    module.salko
  ]
}

# Cannot create api token with terraform, needs to be done manually
# resource "github_actions_secret" "cf_dns_api_token" {
#   repository      = var.github_repository
#   secret_name     = "CF_DNS_API_TOKEN"
#   plaintext_value = cloudflare_api_token.traefik.value
# 
#   depends_on = [
#     cloudflare_api_token.traefik
#   ]
# }
