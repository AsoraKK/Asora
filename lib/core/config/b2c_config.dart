// TEMPORARY: Hardcoded B2C configuration
// TODO: Replace with API call to /api/auth/b2c-config once Key Vault permissions are propagated
// See: functions/src/auth/routes/getConfig.ts

/// Hardcoded Azure AD B2C configuration for mobile app authentication.
///
/// This constant contains all necessary configuration for MSAL authentication
/// including tenant details, client ID, scopes, and redirect URIs for both
/// Android and iOS platforms.
const Map<String, dynamic> kB2CConfig = {
  'tenant': 'asoraauthlife.onmicrosoft.com',
  'clientId': 'c07bb257-aaf0-4179-be95-fce516f92e8c',
  'policy': 'B2C_1_signupsignin',
  'authorityHost': 'asoraauthlife.ciamlogin.com',
  'scopes': ['openid', 'offline_access', 'email', 'profile'],
  'redirectUris': {
    'android': 'com.asora.app://oauth/callback',
    'ios': 'msalc07bb257-aaf0-4179-be95-fce516f92e8c://auth',
  },
  'knownAuthorities': ['asoraauthlife.ciamlogin.com'],
  'googleIdpHint': 'Google',
};
