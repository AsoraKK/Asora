// TEMPORARY: Hardcoded B2C configuration
// TODO: Replace with API call to /api/auth/b2c-config once Key Vault permissions are propagated
// See: functions/src/auth/routes/getConfig.ts

/// Hardcoded Azure AD B2C configuration for mobile app authentication.
/// 
/// This constant contains all necessary configuration for MSAL authentication
/// including tenant details, client ID, scopes, and redirect URIs for both
/// Android and iOS platforms.
const Map<String, dynamic> kB2CConfig = {
  'tenant': 'asoraauth.onmicrosoft.com',
  'clientId': 'd993e983-9f6e-44b4-b098-607af033832f',
  'policy': 'B2C_1_signupsignin',
  'authorityHost': 'asoraauth.b2clogin.com',
  'scopes': [
    'openid',
    'offline_access',
    'email',
    'profile',
  ],
  'redirectUris': {
    'android': 'com.asora.app://oauth/callback',
    'ios': 'msald993e983-9f6e-44b4-b098-607af033832f://auth',
  },
  'knownAuthorities': [
    'asoraauth.b2clogin.com',
  ],
  'googleIdpHint': 'Google',
};
