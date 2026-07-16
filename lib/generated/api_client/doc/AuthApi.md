# asora_api_client.api.AuthApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://api.lythaus.co/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**authAuthorize**](AuthApi.md#authauthorize) | **GET** /auth/authorize | OAuth2 authorization endpoint
[**authEmailForgotPassword**](AuthApi.md#authemailforgotpassword) | **POST** /auth/email/forgot-password | Request a password-reset email
[**authEmailLogin**](AuthApi.md#authemaillogin) | **POST** /auth/email/login | Sign in with email and password
[**authEmailRegister**](AuthApi.md#authemailregister) | **POST** /auth/email/register | Register an email/password account
[**authEmailResend**](AuthApi.md#authemailresend) | **POST** /auth/email/resend | Resend email verification
[**authEmailResetPassword**](AuthApi.md#authemailresetpassword) | **POST** /auth/email/reset-password | Complete a password reset
[**authEmailVerify**](AuthApi.md#authemailverify) | **POST** /auth/email/verify | Verify an email address
[**authInviteValidate**](AuthApi.md#authinvitevalidate) | **GET** /auth/invite/validate | Validate an invite code
[**authPing**](AuthApi.md#authping) | **GET** /auth/ping | Verify authentication token is valid
[**authRedeemInvite**](AuthApi.md#authredeeminvite) | **POST** /auth/redeem-invite | Redeem an invite code to activate account
[**authRefresh**](AuthApi.md#authrefresh) | **POST** /auth/refresh | Rotate a refresh token
[**authSessionsRevoke**](AuthApi.md#authsessionsrevoke) | **POST** /auth/sessions/revoke | Revoke an active session
[**authToken**](AuthApi.md#authtoken) | **POST** /auth/token | Issue OAuth2 tokens
[**authUserInfo**](AuthApi.md#authuserinfo) | **GET** /auth/userinfo | OIDC UserInfo endpoint
[**authUserInfoPost**](AuthApi.md#authuserinfopost) | **POST** /auth/userinfo | OIDC UserInfo endpoint (POST)


# **authAuthorize**
> String authAuthorize(responseType, clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope)

OAuth2 authorization endpoint

Initiates the OAuth 2.0 Authorization Code flow. On success, issues a 302 redirect to the `redirect_uri` with an authorization `code` and the `state` parameter echoed back.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final String responseType = responseType_example; // String |
final String clientId = clientId_example; // String |
final String redirectUri = redirectUri_example; // String |
final String state = state_example; // String |
final String codeChallenge = codeChallenge_example; // String | PKCE code challenge (S256 method required)
final String codeChallengeMethod = codeChallengeMethod_example; // String |
final String scope = openid profile email; // String |

try {
    final response = api.authAuthorize(responseType, clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authAuthorize: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **responseType** | **String**|  |
 **clientId** | **String**|  |
 **redirectUri** | **String**|  |
 **state** | **String**|  | [optional]
 **codeChallenge** | **String**| PKCE code challenge (S256 method required) | [optional]
 **codeChallengeMethod** | **String**|  | [optional]
 **scope** | **String**|  | [optional]

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailForgotPassword**
> EmailAuthStatusResponse authEmailForgotPassword(emailOnlyRequest)

Request a password-reset email

Always returns a neutral response to resist account enumeration.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailOnlyRequest emailOnlyRequest = ; // EmailOnlyRequest |

try {
    final response = api.authEmailForgotPassword(emailOnlyRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailForgotPassword: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailOnlyRequest** | [**EmailOnlyRequest**](EmailOnlyRequest.md)|  |

### Return type

[**EmailAuthStatusResponse**](EmailAuthStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailLogin**
> EmailLoginResponse authEmailLogin(emailPasswordRequest)

Sign in with email and password

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailPasswordRequest emailPasswordRequest = ; // EmailPasswordRequest |

try {
    final response = api.authEmailLogin(emailPasswordRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailLogin: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailPasswordRequest** | [**EmailPasswordRequest**](EmailPasswordRequest.md)|  |

### Return type

[**EmailLoginResponse**](EmailLoginResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailRegister**
> EmailAuthStatusResponse authEmailRegister(emailPasswordRequest)

Register an email/password account

Creates an unverified account and sends a single-use verification email. The response is deliberately neutral.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailPasswordRequest emailPasswordRequest = ; // EmailPasswordRequest |

try {
    final response = api.authEmailRegister(emailPasswordRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailRegister: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailPasswordRequest** | [**EmailPasswordRequest**](EmailPasswordRequest.md)|  |

### Return type

[**EmailAuthStatusResponse**](EmailAuthStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailResend**
> EmailAuthStatusResponse authEmailResend(emailOnlyRequest)

Resend email verification

Returns a neutral response whether or not the account exists.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailOnlyRequest emailOnlyRequest = ; // EmailOnlyRequest |

try {
    final response = api.authEmailResend(emailOnlyRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailResend: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailOnlyRequest** | [**EmailOnlyRequest**](EmailOnlyRequest.md)|  |

### Return type

[**EmailAuthStatusResponse**](EmailAuthStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailResetPassword**
> EmailAuthStatusResponse authEmailResetPassword(emailPasswordResetRequest)

Complete a password reset

Consumes a single-use reset token, replaces the password hash, and revokes existing refresh sessions.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailPasswordResetRequest emailPasswordResetRequest = ; // EmailPasswordResetRequest |

try {
    final response = api.authEmailResetPassword(emailPasswordResetRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailResetPassword: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailPasswordResetRequest** | [**EmailPasswordResetRequest**](EmailPasswordResetRequest.md)|  |

### Return type

[**EmailAuthStatusResponse**](EmailAuthStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authEmailVerify**
> EmailAuthStatusResponse authEmailVerify(emailTokenRequest)

Verify an email address

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final EmailTokenRequest emailTokenRequest = ; // EmailTokenRequest |

try {
    final response = api.authEmailVerify(emailTokenRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authEmailVerify: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **emailTokenRequest** | [**EmailTokenRequest**](EmailTokenRequest.md)|  |

### Return type

[**EmailAuthStatusResponse**](EmailAuthStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authInviteValidate**
> InviteValidationResponse authInviteValidate(code)

Validate an invite code

Validates an invite code without revealing status details.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final String code = code_example; // String | Invite code (format XXXX-XXXX)

try {
    final response = api.authInviteValidate(code);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authInviteValidate: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **String**| Invite code (format XXXX-XXXX) | [optional]

### Return type

[**InviteValidationResponse**](InviteValidationResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authPing**
> JsonObject authPing()

Verify authentication token is valid

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();

try {
    final response = api.authPing();
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authPing: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authRedeemInvite**
> RedeemInviteResponse authRedeemInvite(redeemInviteRequest)

Redeem an invite code to activate account

Allows an authenticated but inactive user to redeem a valid invite code. On success the user is activated and a fresh token pair is returned.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final RedeemInviteRequest redeemInviteRequest = {"inviteCode":"ABCD-1234"}; // RedeemInviteRequest |

try {
    final response = api.authRedeemInvite(redeemInviteRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authRedeemInvite: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **redeemInviteRequest** | [**RedeemInviteRequest**](RedeemInviteRequest.md)|  |

### Return type

[**RedeemInviteResponse**](RedeemInviteResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authRefresh**
> JsonObject authRefresh(body)

Rotate a refresh token

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final JsonObject body = Object; // JsonObject |

try {
    final response = api.authRefresh(body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authRefresh: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | **JsonObject**|  |

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authSessionsRevoke**
> JsonObject authSessionsRevoke(body)

Revoke an active session

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final JsonObject body = Object; // JsonObject |

try {
    final response = api.authSessionsRevoke(body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authSessionsRevoke: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | **JsonObject**|  |

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authToken**
> OAuthTokenResponse authToken(authTokenRequest)

Issue OAuth2 tokens

Exchange an authorization code or refresh token for an access token and refresh token. Implements OAuth 2.0 Authorization Code with PKCE (RFC 7636) and Refresh Token grants.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();
final AuthTokenRequest authTokenRequest = {"grant_type":"authorization_code","client_id":"asora-mobile","code":"SplxlOBeZQQYbYS6WxSbIA","redirect_uri":"com.asora.app://callback","code_verifier":"dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"}; // AuthTokenRequest |

try {
    final response = api.authToken(authTokenRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authToken: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **authTokenRequest** | [**AuthTokenRequest**](AuthTokenRequest.md)|  |

### Return type

[**OAuthTokenResponse**](OAuthTokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authUserInfo**
> UserInfoResponse authUserInfo()

OIDC UserInfo endpoint

Returns claims about the authenticated user per OpenID Connect Core 1.0.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();

try {
    final response = api.authUserInfo();
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authUserInfo: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**UserInfoResponse**](UserInfoResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authUserInfoPost**
> UserInfoResponse authUserInfoPost()

OIDC UserInfo endpoint (POST)

POST variant of the UserInfo endpoint for clients that cannot use query strings.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAuthApi();

try {
    final response = api.authUserInfoPost();
    print(response);
} catch on DioException (e) {
    print('Exception when calling AuthApi->authUserInfoPost: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**UserInfoResponse**](UserInfoResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/x-www-form-urlencoded
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)
