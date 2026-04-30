# asora_api_client.api.AuthApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**authAuthorize**](AuthApi.md#authauthorize) | **GET** /auth/authorize | OAuth2 authorization endpoint
[**authInviteValidate**](AuthApi.md#authinvitevalidate) | **GET** /auth/invite/validate | Validate an invite code
[**authRedeemInvite**](AuthApi.md#authredeeminvite) | **POST** /auth/redeem-invite | Redeem an invite code to activate account
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

