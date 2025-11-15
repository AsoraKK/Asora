# asora_api_client.api.PrivacyAdminApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**clearLegalHold**](PrivacyAdminApi.md#clearlegalhold) | **POST** /admin/legal-hold/clear | Clear an existing legal hold
[**enqueueDsrDelete**](PrivacyAdminApi.md#enqueuedsrdelete) | **POST** /admin/dsr/delete | Enqueue a Data Subject Request delete
[**enqueueDsrExport**](PrivacyAdminApi.md#enqueuedsrexport) | **POST** /admin/dsr/export | Enqueue a Data Subject Request export
[**placeLegalHold**](PrivacyAdminApi.md#placelegalhold) | **POST** /admin/legal-hold/place | Place a legal hold


# **clearLegalHold**
> clearLegalHold(legalHoldClear)

Clear an existing legal hold

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyAdminApi();
final LegalHoldClear legalHoldClear = ; // LegalHoldClear | 

try {
    api.clearLegalHold(legalHoldClear);
} catch on DioException (e) {
    print('Exception when calling PrivacyAdminApi->clearLegalHold: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **legalHoldClear** | [**LegalHoldClear**](LegalHoldClear.md)|  | 

### Return type

void (empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **enqueueDsrDelete**
> DsrRequestSummary enqueueDsrDelete(dsrRequestInput)

Enqueue a Data Subject Request delete

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyAdminApi();
final DsrRequestInput dsrRequestInput = ; // DsrRequestInput | 

try {
    final response = api.enqueueDsrDelete(dsrRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyAdminApi->enqueueDsrDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **dsrRequestInput** | [**DsrRequestInput**](DsrRequestInput.md)|  | 

### Return type

[**DsrRequestSummary**](DsrRequestSummary.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **enqueueDsrExport**
> DsrRequestSummary enqueueDsrExport(dsrRequestInput)

Enqueue a Data Subject Request export

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyAdminApi();
final DsrRequestInput dsrRequestInput = ; // DsrRequestInput | 

try {
    final response = api.enqueueDsrExport(dsrRequestInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyAdminApi->enqueueDsrExport: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **dsrRequestInput** | [**DsrRequestInput**](DsrRequestInput.md)|  | 

### Return type

[**DsrRequestSummary**](DsrRequestSummary.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **placeLegalHold**
> LegalHoldRecord placeLegalHold(legalHoldInput)

Place a legal hold

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPrivacyAdminApi();
final LegalHoldInput legalHoldInput = ; // LegalHoldInput | 

try {
    final response = api.placeLegalHold(legalHoldInput);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PrivacyAdminApi->placeLegalHold: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **legalHoldInput** | [**LegalHoldInput**](LegalHoldInput.md)|  | 

### Return type

[**LegalHoldRecord**](LegalHoldRecord.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

