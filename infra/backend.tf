terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate20677"   # ← your SA name
    container_name       = "tfstate"
    key                  = "infra.dev.tfstate"  # change “dev” per env
  }
}
