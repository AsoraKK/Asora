/// ASORA ENVIRONMENT CONFIGURATION
///
/// 🎯 Purpose: Environment-specific configuration (dev/staging/prod)
/// 🔐 Security: Embeds TLS pins and device integrity policies per environment
/// 📱 Platform: Flutter multi-environment support
library;

import 'package:flutter/foundation.dart';

/// Environment enumeration
enum Environment {
  development,
  staging,
  production;

  /// Get current environment from build configuration
  static Environment get current {
    const envString = String.fromEnvironment(
      'ENVIRONMENT',
      defaultValue: 'development',
    );

    switch (envString.toLowerCase()) {
      case 'production':
      case 'prod':
        return Environment.production;
      case 'staging':
      case 'stg':
        return Environment.staging;
      case 'development':
      case 'dev':
      default:
        return Environment.development;
    }
  }

  bool get isDev => this == Environment.development;
  bool get isStaging => this == Environment.staging;
  bool get isProd => this == Environment.production;
}

/// TLS certificate pinning configuration
class TlsPinConfig {
  final bool enabled;
  final bool strictMode; // true = block, false = warn-only
  final List<String> spkiPinsBase64; // SPKI SHA-256 pins, Base64

  const TlsPinConfig({
    required this.enabled,
    required this.strictMode,
    required this.spkiPinsBase64,
  });

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'strictMode': strictMode,
    'pinCount': spkiPinsBase64.length,
  };
}

/// Mobile security configuration
class MobileSecurityConfig {
  final TlsPinConfig tlsPins;
  final bool strictDeviceIntegrity;
  final bool blockRootedDevices;
  final bool allowRootedInStagingForQa;

  const MobileSecurityConfig({
    required this.tlsPins,
    required this.strictDeviceIntegrity,
    required this.blockRootedDevices,
    this.allowRootedInStagingForQa = false,
  });

  Map<String, dynamic> toJson() => {
    'tlsPins': tlsPins.toJson(),
    'strictDeviceIntegrity': strictDeviceIntegrity,
    'blockRootedDevices': blockRootedDevices,
    'allowRootedInStagingForQa': allowRootedInStagingForQa,
  };
}

/// Complete environment configuration
class EnvironmentConfig {
  final Environment environment;
  final String apiBaseUrl;
  final MobileSecurityConfig security;

  const EnvironmentConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.security,
  });

  /// Get configuration for current environment
  factory EnvironmentConfig.fromEnvironment() {
    final env = Environment.current;

    switch (env) {
      case Environment.development:
        return _devConfig;
      case Environment.staging:
        return _stagingConfig;
      case Environment.production:
        return _prodConfig;
    }
  }

  Map<String, dynamic> toJson() => {
    'environment': environment.name,
    'apiBaseUrl': apiBaseUrl,
    'security': security.toJson(),
  };
}

// Dev configuration: warn-only, flexible for development
const _devMobileSecurity = MobileSecurityConfig(
  tlsPins: TlsPinConfig(
    enabled: true,
    strictMode: false, // warn-only in dev
    spkiPinsBase64: [
      // Dev Function App SPKI pin (from infra notes)
      'sAgmPn4rf81EWKQFg+momPe9NFYswENqbsBnpcm16jM=',
      // Azure intermediate cert (backup)
      'ZkWBotC4nL+Ba/kXaVPx7TpoRSF9uwxEAuufz67J7sQ=',
    ],
  ),
  strictDeviceIntegrity: false,
  blockRootedDevices: false,
  allowRootedInStagingForQa: false,
);

const _devConfig = EnvironmentConfig(
  environment: Environment.development,
  apiBaseUrl: kDebugMode
      ? 'http://10.0.2.2:7072/api' // Local emulator
      : 'https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net/api',
  security: _devMobileSecurity,
);

// Staging configuration: strict but can be relaxed for QA
const _stagingMobileSecurity = MobileSecurityConfig(
  tlsPins: TlsPinConfig(
    enabled: true,
    strictMode: true, // block on mismatch
    spkiPinsBase64: [
      // TODO: Add staging SPKI pins when staging environment provisioned
      // Use tools/extract_spki.dart to generate pins
    ],
  ),
  strictDeviceIntegrity: true,
  blockRootedDevices: true,
  allowRootedInStagingForQa: false, // Toggle to true for QA testing
);

const _stagingConfig = EnvironmentConfig(
  environment: Environment.staging,
  apiBaseUrl:
      'https://asora-function-staging.northeurope-01.azurewebsites.net/api',
  security: _stagingMobileSecurity,
);

// Production configuration: strict, secure defaults
const _prodMobileSecurity = MobileSecurityConfig(
  tlsPins: TlsPinConfig(
    enabled: true,
    strictMode: true, // block on mismatch
    spkiPinsBase64: [
      // TODO: Add production SPKI pins before GA
      // Use tools/extract_spki.dart to generate pins
      // Include current + backup pin for rotation
    ],
  ),
  strictDeviceIntegrity: true,
  blockRootedDevices: true,
  allowRootedInStagingForQa: false,
);

const _prodConfig = EnvironmentConfig(
  environment: Environment.production,
  apiBaseUrl:
      'https://asora-function-prod.northeurope-01.azurewebsites.net/api',
  security: _prodMobileSecurity,
);
