# asora_api_client.model.AuthTokenRequest

## Load the model package
```dart
import 'package:asora_api_client/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**grantType** | **String** | Grant type | 
**clientId** | **String** | Registered client identifier | 
**code** | **String** | Authorization code (required for authorization_code grant) | [optional] 
**redirectUri** | **String** | Must match the redirect URI used during authorization | [optional] 
**codeVerifier** | **String** | PKCE code verifier (required when code_challenge was provided) | [optional] 
**refreshToken** | **String** | Refresh token (required for refresh_token grant) | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


