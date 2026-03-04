// ignore_for_file: public_member_api_docs

/// LYTHAUS SUBSCRIPTION SERVICE
///
/// Architecture-only interface for future IAP/payment integration.
/// Defines the contract the app will use to check subscription status,
/// start purchases, and restore previous purchases.
///
/// When a payment provider is chosen, implement this interface with
/// provider-specific logic (RevenueCat SDK, StoreKit 2, Google Billing Library).
library;

import 'package:dio/dio.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Domain Models
// ─────────────────────────────────────────────────────────────────────────────

/// Active subscription status returned by the backend
class SubscriptionStatus {
  final String userId;
  final String tier;
  final String status;
  final String? provider;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final SubscriptionEntitlements entitlements;

  const SubscriptionStatus({
    required this.userId,
    required this.tier,
    required this.status,
    this.provider,
    this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
    required this.entitlements,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      userId: json['userId'] as String,
      tier: json['tier'] as String,
      status: json['status'] as String,
      provider: json['provider'] as String?,
      currentPeriodEnd: json['currentPeriodEnd'] != null
          ? DateTime.parse(json['currentPeriodEnd'] as String)
          : null,
      cancelAtPeriodEnd: json['cancelAtPeriodEnd'] as bool? ?? false,
      entitlements: SubscriptionEntitlements.fromJson(
        json['entitlements'] as Map<String, dynamic>,
      ),
    );
  }

  /// Whether the user has an active paid subscription
  bool get isPaid => tier != 'free' && status == 'active';

  /// Whether the subscription is about to expire
  bool get isExpiring =>
      cancelAtPeriodEnd &&
      currentPeriodEnd != null &&
      currentPeriodEnd!.isAfter(DateTime.now());
}

/// Tier-based entitlements derived from the subscription
class SubscriptionEntitlements {
  final int dailyPosts;
  final int maxMediaSizeMB;
  final int maxMediaPerPost;

  const SubscriptionEntitlements({
    required this.dailyPosts,
    required this.maxMediaSizeMB,
    required this.maxMediaPerPost,
  });

  factory SubscriptionEntitlements.fromJson(Map<String, dynamic> json) {
    return SubscriptionEntitlements(
      dailyPosts: json['dailyPosts'] as int,
      maxMediaSizeMB: json['maxMediaSizeMB'] as int,
      maxMediaPerPost: json['maxMediaPerPost'] as int,
    );
  }
}

/// Result of a purchase attempt
sealed class PurchaseResult {
  const PurchaseResult();
}

class PurchaseSuccess extends PurchaseResult {
  final String productId;
  final String tier;
  const PurchaseSuccess({required this.productId, required this.tier});
}

class PurchaseCancelled extends PurchaseResult {
  const PurchaseCancelled();
}

class PurchaseError extends PurchaseResult {
  final String message;
  final String? code;
  const PurchaseError({required this.message, this.code});
}

/// A product available for purchase
class SubscriptionProduct {
  final String productId;
  final String tier;
  final String title;
  final String description;
  final String price;
  final String period; // 'monthly' | 'annual'

  const SubscriptionProduct({
    required this.productId,
    required this.tier,
    required this.title,
    required this.description,
    required this.price,
    required this.period,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

/// Contract for subscription/payment operations.
///
/// Implement this interface when a payment provider is selected:
/// - RevenueCat: Use `purchases_flutter` package
/// - Apple StoreKit 2: Use `in_app_purchase` package
/// - Stripe: Use `stripe_sdk` + backend checkout sessions
abstract class SubscriptionService {
  /// Check current subscription status from the backend
  Future<SubscriptionStatus> checkStatus({required String token});

  /// Get available products/plans for purchase
  Future<List<SubscriptionProduct>> getProducts();

  /// Start a purchase flow for the given product
  Future<PurchaseResult> startPurchase({
    required String productId,
    required String token,
  });

  /// Restore previous purchases (e.g. after reinstall)
  Future<PurchaseResult> restorePurchases({required String token});
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend-Only Implementation (reads status, no IAP flow)
// ─────────────────────────────────────────────────────────────────────────────

/// Minimal implementation that only reads subscription status from the backend.
/// Purchase operations throw UnimplementedError until an IAP provider is wired.
class BackendSubscriptionService implements SubscriptionService {
  final Dio _dio;

  BackendSubscriptionService({required Dio dio}) : _dio = dio;

  @override
  Future<SubscriptionStatus> checkStatus({required String token}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/subscription/status',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return SubscriptionStatus.fromJson(response.data!);
  }

  @override
  Future<List<SubscriptionProduct>> getProducts() async {
    // TODO: Return products from provider SDK when wired
    throw UnimplementedError(
      'IAP products not available — payment provider not configured.',
    );
  }

  @override
  Future<PurchaseResult> startPurchase({
    required String productId,
    required String token,
  }) async {
    // TODO: Delegate to provider SDK when wired
    throw UnimplementedError(
      'In-app purchase not available — payment provider not configured.',
    );
  }

  @override
  Future<PurchaseResult> restorePurchases({required String token}) async {
    // TODO: Delegate to provider SDK when wired
    throw UnimplementedError(
      'Purchase restoration not available — payment provider not configured.',
    );
  }
}
