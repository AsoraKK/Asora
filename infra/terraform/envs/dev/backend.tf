terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate20677"
    container_name       = "tfstate"
    key                  = "cosmos-dev.tfstate"
  }
}
