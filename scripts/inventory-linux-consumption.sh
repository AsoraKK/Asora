#!/usr/bin/env bash
set -Eeuo pipefail

# Lists Linux Consumption Function Apps that still rely on the retiring plan.
az functionapp list \
  --query "[?kind!='functionapp,linux'] | [?ends_with(sku.tier, 'Dynamic') && properties.siteConfig.linuxFxVersion!=''].[name, resourceGroup, location]" \
  -o table
