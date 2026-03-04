output "storage_account_id" {
  description = "Resource ID of the dedicated DSR storage account."
  value       = azurerm_storage_account.dsr.id
}

output "storage_account_name" {
  description = "Name of the DSR storage account."
  value       = azurerm_storage_account.dsr.name
}

output "container_name" {
  description = "Export container name inside the DSR storage account."
  value       = azurerm_storage_container.exports.name
}

output "queue_name" {
  description = "Request queue name inside the DSR storage account."
  value       = azurerm_storage_queue.requests.name
}
