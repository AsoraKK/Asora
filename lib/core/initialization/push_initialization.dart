import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/service_providers.dart';
import '../routing/deeplink_router.dart';

/// Initialize push notification system
/// Call this during app startup after Firebase initialization
Future<void> initializePushNotifications(WidgetRef ref) async {
  // Initialize Firebase
  await Firebase.initializeApp();

  // Get push notification service
  final pushService = ref.read(pushNotificationServiceProvider);

  // Initialize push service
  await pushService.initialize();

  // Get device token service
  final deviceTokenService = ref.read(deviceTokenServiceProvider);

  // Register device token with backend
  try {
    await deviceTokenService.registerDeviceToken();
    debugPrint('[Push] Device token registered with backend');
  } catch (e) {
    debugPrint('[Push] Failed to register device token: $e');
    // Continue anyway - user can still use app
  }

  // Listen to token refresh events and re-register
  pushService.onTokenRefresh.listen((newToken) async {
    debugPrint('[Push] FCM token refreshed');
    try {
      await deviceTokenService.registerDeviceToken();
    } catch (e) {
      debugPrint('[Push] Failed to register refreshed token: $e');
    }
  });

  // Listen to notification taps and handle deep-linking
  // Note: This requires BuildContext which should be passed when available
  // For now, we'll handle this in the root widget
}

/// Widget mixin to handle notification tap routing
mixin NotificationDeepLinkHandler<T extends StatefulWidget> on State<T> {
  @override
  void initState() {
    super.initState();
    // Setup notification tap listener
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupNotificationListener();
    });
  }

  void _setupNotificationListener() {
    if (!mounted) return;

    // Note: For proper Riverpod integration, use ConsumerStatefulWidget
    // instead of mixing in this handler. This is a fallback approach
    // for widgets that can't use ConsumerStatefulWidget.
  }

  /// Override this method to handle notification taps
  Future<void> handleNotificationTap(Map<String, dynamic> data) async {
    if (!mounted) return;
    await DeeplinkRouter.handleNotificationTap(context, data);
  }
}
