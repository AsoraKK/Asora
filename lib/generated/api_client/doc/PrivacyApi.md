# asora_api_client.api.PrivacyApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://api.lythaus.co/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**deleteUserAccount**](PrivacyApi.md#deleteuseraccount) | **DELETE** /user/delete | Legacy synchronous account deletion
[**exportUserData**](PrivacyApi.md#exportuserdata) | **GET** /user/export | Legacy synchronous personal-data export
[**privacyRequestCreate**](PrivacyApi.md#privacyrequestcreate) | **POST** /privacy/requests | Submit an asynchronous privacy request
[**privacyRequestStatus**](PrivacyApi.md#privacyrequeststatus) | **GET** /privacy/requests | Get the latest privacy request status


# **deleteUserAccount**
> AccountDeleteResponse deleteUserAccount(xConfirmDelete)

Legacy synchronous account deletion

Legacy Azure Functions compatibility route retained only while source migration evidence is collected. The Lythaus production runtime uses the asynchronous `/privacy/requests` contract.

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

Legacy synchronous personal-data export

Legacy Azure Functions compatibility route retained only while source migration evidence is collected. The Lythaus production runtime uses the asynchronous `/privacy/requests` contract.

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

# **privacyRequestCreate**
> PrivacyRequestAccepted privacyRequestCreate(privacyRequestCreate, idempotencyKey)

Submit an asynchronous privacy request

Records an export, account deletion, or rectification request and queues it for durable processing. Acceptance does not mean processing is complete.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyApi();
final PrivacyRequestCreate privacyRequestCreate = ; // PrivacyRequestCreate |
final String idempotencyKey = idempotencyKey_example; // String |

try {
    final response = api.privacyRequestCreate(privacyRequestCreate, idempotencyKey);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyApi->privacyRequestCreate: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **privacyRequestCreate** | [**PrivacyRequestCreate**](PrivacyRequestCreate.md)|  |
 **idempotencyKey** | **String**|  | [optional]

### Return type

[**PrivacyRequestAccepted**](PrivacyRequestAccepted.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **privacyRequestStatus**
> PrivacyRequestStatusResponse privacyRequestStatus(requestType)

Get the latest privacy request status

Returns the authenticated user's latest matching asynchronous privacy request.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyApi();
final String requestType = requestType_example; // String |

try {
    final response = api.privacyRequestStatus(requestType);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyApi->privacyRequestStatus: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **requestType** | **String**|  | [optional]

### Return type

[**PrivacyRequestStatusResponse**](PrivacyRequestStatusResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)
