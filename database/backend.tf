terraform {
  backend "azurerm" {
    resource_group_name  = "rg-asora-tfstate"
    storage_account_name = "sttfstateasora123456" # replace with bootstrap SA
    container_name       = "tfstate"
    key                  = "database-${terraform.workspace}.tfstate"
  }
}
