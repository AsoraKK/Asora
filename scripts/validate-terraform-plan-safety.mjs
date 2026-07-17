#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

const protectedTypes = new Set([
  'azurerm_cosmosdb_account',
  'azurerm_cosmosdb_sql_database',
  'azurerm_linux_flex_consumption_function_app',
  'azurerm_linux_function_app',
  'azurerm_service_plan',
  'azurerm_key_vault',
  'azurerm_log_analytics_workspace',
  'azurerm_application_insights',
  'azurerm_postgresql_flexible_server',
  'azurerm_storage_account',
  'azurerm_resource_group',
]);

export function findProtectedChanges(plan) {
  return (plan.resource_changes ?? []).flatMap((resource) => {
    if (!protectedTypes.has(resource.type)) {
      return [];
    }

    const actions = resource.change?.actions ?? [];
    const creates = actions.includes('create');
    const deletes = actions.includes('delete');
    if (!creates && !deletes) {
      return [];
    }

    return [{
      address: resource.address,
      type: resource.type,
      actions,
      classification: creates && deletes ? 'replace' : creates ? 'create' : 'delete',
    }];
  });
}

function main() {
  const [planPath, ...args] = process.argv.slice(2);
  if (!planPath) {
    console.error('Usage: node scripts/validate-terraform-plan-safety.mjs <plan.json> [--allow-protected-changes]');
    process.exit(2);
  }

  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const blocked = findProtectedChanges(plan);
  if (blocked.length === 0) {
    console.log('Terraform safety check passed: no protected creates, replacements, or deletes.');
    return;
  }

  const explicitPath = process.env.INFRASTRUCTURE_CHANGE_PATH === 'approved';
  const explicitFlag = args.includes('--allow-protected-changes');
  if (explicitPath && explicitFlag) {
    console.log(`Terraform safety check acknowledged ${blocked.length} protected change(s) through the explicit infrastructure-change path.`);
    return;
  }

  console.error('Terraform safety check blocked protected infrastructure changes:');
  for (const item of blocked) {
    console.error(`- ${item.classification}: ${item.address} (${item.type})`);
  }
  console.error('Use a separately approved infrastructure-change workflow and review the plan before apply.');
  process.exit(1);
}

if (process.argv[1] && new URL(import.meta.url).pathname.replace(/^\/[A-Za-z]:/, (value) => value.slice(1)).replaceAll('/', '\\').toLowerCase() === process.argv[1].replaceAll('/', '\\').toLowerCase()) {
  main();
}
