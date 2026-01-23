# asora_api_client.api.AuthApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**authInviteValidate**](AuthApi.md#authinvitevalidate) | **GET** /auth/invite/validate | Validate an invite code


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

