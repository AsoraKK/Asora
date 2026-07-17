import assert from 'node:assert/strict';
import test from 'node:test';

import { findProtectedChanges } from '../validate-terraform-plan-safety.mjs';

test('allows in-place updates to protected resources', () => {
  const result = findProtectedChanges({
    resource_changes: [{
      address: 'azurerm_linux_function_app.mvp',
      type: 'azurerm_linux_function_app',
      change: { actions: ['update'] },
    }],
  });

  assert.deepEqual(result, []);
});

test('blocks creates, replacements, and deletes of protected resources', () => {
  const result = findProtectedChanges({
    resource_changes: [
      {
        address: 'azurerm_postgresql_flexible_server.mvp',
        type: 'azurerm_postgresql_flexible_server',
        change: { actions: ['create'] },
      },
      {
        address: 'azurerm_linux_function_app.mvp',
        type: 'azurerm_linux_function_app',
        change: { actions: ['delete', 'create'] },
      },
      {
        address: 'azurerm_storage_account.mvp',
        type: 'azurerm_storage_account',
        change: { actions: ['delete'] },
      },
    ],
  });

  assert.deepEqual(result.map((item) => item.classification), ['create', 'replace', 'delete']);
});

test('ignores ordinary application-level resources', () => {
  const result = findProtectedChanges({
    resource_changes: [{
      address: 'azurerm_monitor_scheduled_query_rules_alert_v2.dsr',
      type: 'azurerm_monitor_scheduled_query_rules_alert_v2',
      change: { actions: ['create'] },
    }],
  });

  assert.deepEqual(result, []);
});
