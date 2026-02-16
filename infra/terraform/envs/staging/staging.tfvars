account_name          = "asora-cosmos-staging"
database_name         = "asora"
cosmos_resource_group = "asora-staging-rg"

storage_location                    = "eastus"
storage_resource_group              = "asora-staging-rg"
storage_vnet_subnet_id              = ""
storage_tags                        = {}
observability_enabled               = true
observability_resource_group        = "asora-staging-rg"
observability_location              = "eastus"
observability_name_prefix           = "asora-staging"
observability_alert_email_addresses = []
function_app_resource_id            = ""
observability_tags                  = {}
# function_principal_id must be supplied securely via CLI or pipeline secrets
