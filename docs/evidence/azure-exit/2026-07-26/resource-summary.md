# Resource Summary

Live `az resource list` returned 29 resource records in the subscription. Five resource groups exist; the primary group contains the application estate. Provider-specific storage discovery also found `stasoradsrdev`, which was absent from the generic resource listing and must be reconciled before shutdown.

Highest likely cost impact, based on service shape and prior repository evidence rather than current billing data: PostgreSQL Flexible Server, running Flex Function App/always-ready DSR processing, Log Analytics/Application Insights ingestion, and retained storage. Exact ranking is unverified because Cost Management CLI access is unavailable.

Outside the primary group, `NetworkWatcherRG`, `DefaultResourceGroup-NEU`, `tfstate-rg`, and `DefaultResourceGroup-WEU` require an explicit residual-resource query and billing review.
