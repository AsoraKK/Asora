// Legacy B2C compatibility configuration sourced from compile-time variables.
// The active auth source of truth lives in
// lib/features/auth/application/oauth2_service.dart and
// lib/features/auth/application/web_auth_service.dart.
//
// Override at build time with:
//   flutter build ... --dart-define=AD_B2C_TENANT=<tenant> \
//                     --dart-define=AD_B2C_CLIENT_ID=<clientId> \
//                     --dart-define=AD_B2C_POLICY=<policy> \
//                     --dart-define=AD_B2C_AUTHORITY_HOST=<host>
//
// kB2CConfig is a read-only compatibility mirror for callers that still need
// the legacy B2C-shaped configuration map.

const String _kTenant = String.fromEnvironment(
  'AD_B2C_TENANT',
  defaultValue: 'asoraauthlife.onmicrosoft.com',
);
const String _kClientId = String.fromEnvironment(
  'AD_B2C_CLIENT_ID',
  defaultValue: 'c07bb257-aaf0-4179-be95-fce516f92e8c',
);
const String _kPolicy = String.fromEnvironment(
  'AD_B2C_POLICY',
  defaultValue: 'B2C_1_signupsignin',
);
const String _kAuthorityHost = String.fromEnvironment(
  'AD_B2C_AUTHORITY_HOST',
  defaultValue: 'asoraauthlife.ciamlogin.com',
);

/// Legacy Azure AD B2C configuration for older app paths.
///
/// Values are sourced from compile-time `--dart-define` variables so
/// staging and production builds can use different tenants/client IDs
/// without hardcoding secrets in source.
const Map<String, dynamic> kB2CConfig = {
  'tenant': _kTenant,
  'clientId': _kClientId,
  'policy': _kPolicy,
  'authorityHost': _kAuthorityHost,
  'scopes': ['openid', 'offline_access', 'email', 'profile'],
  'redirectUris': {
    'android': 'com.asora.app://oauth/callback',
    'ios': 'msal\$_kClientId://auth',
  },
  'knownAuthorities': [_kAuthorityHost],
  'googleIdpHint': 'Google',
};
