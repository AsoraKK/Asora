# asora_api_client.api.PrivacyApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**deleteUserAccount**](PrivacyApi.md#deleteuseraccount) | **DELETE** /user/delete | Delete own account (GDPR Article 17)
[**exportUserData**](PrivacyApi.md#exportuserdata) | **GET** /user/export | Export personal data (GDPR Article 20)


# **deleteUserAccount**
> AccountDeleteResponse deleteUserAccount(xConfirmDelete)

Delete own account (GDPR Article 17)

Permanently deletes the authenticated user's account and anonymises all authored content. Requires the `X-Confirm-Delete: true` header to guard against accidental invocations. This action is **irreversible**. 

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyApi();
final String xConfirmDelete = xConfirmDelete_example; // String | Must be set to \"true\" to confirm deletion

try {
    final response = api.deleteUserAccount(xConfirmDelete);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyApi->deleteUserAccount: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **xConfirmDelete** | **String**| Must be set to \"true\" to confirm deletion | 

### Return type

[**AccountDeleteResponse**](AccountDeleteResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **exportUserData**
> DSRExportResponse exportUserData()

Export personal data (GDPR Article 20)

Returns a structured copy of all personal data held for the authenticated user. Export cooldown periods are tier-gated. The `X-Export-ID` response header contains the export identifier for tracking. 

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyApi();

try {
    final response = api.exportUserData();
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyApi->exportUserData: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**DSRExportResponse**](DSRExportResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

