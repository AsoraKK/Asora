/// Tests for BudgetScreen and BudgetScreenNotifier.
library;

import 'dart:async';

import 'package:asora/features/admin/api/admin_api_client.dart';
import 'package:asora/features/admin/ui/budget_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeAdminApiClient extends AdminApiClient {
  _FakeAdminApiClient({
    required BudgetInfo Function() budgetBuilder,
    BudgetUpdateResult Function(double amount)? updateBuilder,
    Future<BudgetInfo> Function()? getBudgetFuture,
  }) : _budgetBuilder = budgetBuilder,
       _updateBuilder = updateBuilder,
       _getBudgetFuture = getBudgetFuture,
       super(Dio());

  final BudgetInfo Function() _budgetBuilder;
  final BudgetUpdateResult Function(double amount)? _updateBuilder;
  final Future<BudgetInfo> Function()? _getBudgetFuture;

  int getBudgetCalls = 0;
  int updateBudgetCalls = 0;
  double? lastUpdateAmount;

  @override
  Future<BudgetInfo> getBudget() {
    getBudgetCalls++;
    final future = _getBudgetFuture;
    if (future != null) return future();
    return Future.value(_budgetBuilder());
  }

  @override
  Future<BudgetUpdateResult> updateBudget(double amount) {
    updateBudgetCalls++;
    lastUpdateAmount = amount;
    return Future.value(
      _updateBuilder?.call(amount) ??
          BudgetUpdateResult(
            budget: _budgetBuilder(),
            azureSynced: true,
          ),
    );
  }
}

BudgetInfo _budgetInfo({
  double amount = 250,
}) {
  return BudgetInfo(
    amount: amount,
    azureBudgetName: 'lythaus-budget',
    resourceGroup: 'rg-lythaus',
    notificationEmail: 'alerts@lythaus.example',
    thresholds: const {
      'actual': [50, 100],
      'forecasted': [75, 90],
    },
    updatedAt: DateTime.utc(2026, 1, 1, 12),
    updatedBy: 'admin@lythaus.example',
  );
}

Widget _buildApp(BudgetScreenNotifier notifier) {
  return ProviderScope(
    overrides: [budgetScreenProvider.overrideWith((ref) => notifier)],
    child: const MaterialApp(home: BudgetScreen()),
  );
}

void main() {
  test('BudgetScreenState detects dirty changes and copyWith', () {
    final budget = _budgetInfo();
    const empty = BudgetScreenState();

    expect(empty.isDirty, isFalse);

    final state = BudgetScreenState(
      status: BudgetScreenStatus.idle,
      serverBudget: budget,
      draftAmount: 300,
    );
    expect(state.isDirty, isTrue);

    final copied = state.copyWith(
      status: BudgetScreenStatus.saved,
      errorMessage: 'boom',
      azureSynced: true,
    );
    expect(copied.status, BudgetScreenStatus.saved);
    expect(copied.errorMessage, 'boom');
    expect(copied.azureSynced, isTrue);
    expect(copied.serverBudget, budget);
  });

  test('notifier loads budget and can save updates', () async {
    final client = _FakeAdminApiClient(
      budgetBuilder: _budgetInfo,
      updateBuilder: (amount) => BudgetUpdateResult(
        budget: _budgetInfo(amount: amount),
        azureSynced: false,
      ),
    );
    final notifier = BudgetScreenNotifier(client);
    await Future<void>.delayed(Duration.zero);

    expect(notifier.state.status, BudgetScreenStatus.idle);
    expect(notifier.state.serverBudget?.amount, 250);

    notifier.setDraftAmount(300);
    expect(notifier.state.status, BudgetScreenStatus.dirty);

    await notifier.save();
    expect(client.updateBudgetCalls, 1);
    expect(client.lastUpdateAmount, 300);
    expect(notifier.state.status, BudgetScreenStatus.idle);
    expect(notifier.state.azureSynced, isFalse);
  });

  test('notifier surfaces load errors', () async {
    final client = _FakeAdminApiClient(
      budgetBuilder: _budgetInfo,
      getBudgetFuture: () => Future.error(
        const AdminApiException(message: 'nope', code: 'LOAD_FAILED'),
      ),
    );
    final notifier = BudgetScreenNotifier(client);
    await Future<void>.delayed(Duration.zero);

    // Constructor-triggered load should have placed the notifier into error.
    expect(client.getBudgetCalls, 1);
    expect(notifier.state.status, BudgetScreenStatus.error);
    expect(notifier.state.errorMessage, 'nope');
  });

  testWidgets('loading, error, loaded, dirty, saving, and saved states render', (
    tester,
  ) async {
    final completer = Completer<BudgetInfo>();
    final client = _FakeAdminApiClient(
      budgetBuilder: _budgetInfo,
      getBudgetFuture: () => completer.future,
      updateBuilder: (amount) => BudgetUpdateResult(
        budget: _budgetInfo(amount: amount),
        azureSynced: true,
      ),
    );
    final notifier = BudgetScreenNotifier(client);

    await tester.pumpWidget(_buildApp(notifier));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.complete(_budgetInfo());
    await tester.pumpAndSettle();
    expect(find.text('Synced'), findsOneWidget);
    expect(find.text('\$250'), findsOneWidget);
    expect(find.text('Actual spend alerts'), findsOneWidget);
    expect(find.text('Forecast alerts'), findsOneWidget);

    notifier.setDraftAmount(300);
    await tester.pump();
    expect(find.text('Unsaved changes'), findsOneWidget);
    expect(find.text('Save Budget'), findsOneWidget);

    notifier.state = notifier.state.copyWith(status: BudgetScreenStatus.saving);
    await tester.pump();
    expect(find.text('Saving...'), findsAtLeastNWidgets(1));

    notifier.state = BudgetScreenState(
      status: BudgetScreenStatus.saved,
      serverBudget: _budgetInfo(amount: 300),
      draftAmount: 300,
      azureSynced: true,
    );
    await tester.pump();
    expect(find.text('Saved'), findsOneWidget);
    expect(find.text('Azure budget updated successfully'), findsOneWidget);
  });
}
