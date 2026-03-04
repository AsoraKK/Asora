terraform {
  backend "azurerm" {
    resource_group_name  = "rg-asora-tfstate"     # from bootstrap output
    storage_account_name = "sttfstateasora123456" # replace with bootstrap SA name
    container_name       = "tfstate"
    key                  = "asora-${terraform.workspace}.tfstate"
  }
}
