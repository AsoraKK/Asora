import 'package:asora/features/notifications/application/notification_permission_service.dart';
import 'package:asora/features/notifications/domain/notification_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:permission_handler_platform_interface/permission_handler_platform_interface.dart';

class _FakePermissionHandlerPlatform extends PermissionHandlerPlatform {
  PermissionStatus status = PermissionStatus.denied;
  PermissionStatus requestStatus = PermissionStatus.denied;
  bool openSettingsCalled = false;

  @override
  Future<PermissionStatus> checkPermissionStatus(Permission permission) async {
    return status;
  }

  @override
  Future<Map<Permission, PermissionStatus>> requestPermissions(
    List<Permission> permissions,
  ) async {
    return {for (final permission in permissions) permission: requestStatus};
  }

  @override
  Future<bool> openAppSettings() async {
    openSettingsCalled = true;
    return true;
  }

  @override
  Future<ServiceStatus> checkServiceStatus(Permission permission) async {
    return ServiceStatus.enabled;
  }

  @override
  Future<bool> shouldShowRequestPermissionRationale(
    Permission permission,
  ) async {
    return false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late PermissionHandlerPlatform originalPlatform;
  late _FakePermissionHandlerPlatform fakePlatform;
  late NotificationPermissionService service;

  setUp(() {
    originalPlatform = PermissionHandlerPlatform.instance;
    fakePlatform = _FakePermissionHandlerPlatform();
    PermissionHandlerPlatform.instance = fakePlatform;
    service = NotificationPermissionService();
  });

  tearDown(() {
    PermissionHandlerPlatform.instance = originalPlatform;
  });

  test('checkPermissionStatus maps granted to authorized', () async {
    fakePlatform.status = PermissionStatus.granted;
    final status = await service.checkPermissionStatus();
    expect(status, NotificationPermissionStatus.authorized);
  });

  test('requestPermission maps limited to provisional', () async {
    fakePlatform.requestStatus = PermissionStatus.limited;
    final status = await service.requestPermission();
    expect(status, NotificationPermissionStatus.provisional);
  });

  test('shouldShowPrePrompt returns true for denied', () async {
    fakePlatform.status = PermissionStatus.denied;
    final result = await service.shouldShowPrePrompt();
    expect(result, isTrue);
  });

  test('shouldShowPrePrompt returns false for authorized', () async {
    fakePlatform.status = PermissionStatus.granted;
    final result = await service.shouldShowPrePrompt();
    expect(result, isFalse);
  });
}
