account_name                 = "asora-cosmos-prod"
database_name                = "asora"
cosmos_resource_group        = "asora-prod-rg"
storage_location             = "eastus2"
storage_resource_group       = "asora-prod-rg"
storage_vnet_subnet_id       = ""
storage_tags                 = {}
observability_enabled        = true
observability_resource_group = "asora-prod-rg"
observability_location       = "eastus2"
observability_name_prefix    = "asora-prod"
observability_alert_email_addresses = [
  "platform-oncall@lythaus.app",
  "backend-oncall@lythaus.app"
]
function_app_resource_id = ""
observability_tags       = {}
