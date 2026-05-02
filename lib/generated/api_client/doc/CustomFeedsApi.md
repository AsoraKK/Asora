# asora_api_client.api.CustomFeedsApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**customFeedsCreate**](CustomFeedsApi.md#customfeedscreate) | **POST** /custom-feeds | Create a new custom feed
[**customFeedsDelete**](CustomFeedsApi.md#customfeedsdelete) | **DELETE** /custom-feeds/{id} | Delete a custom feed
[**customFeedsGet**](CustomFeedsApi.md#customfeedsget) | **GET** /custom-feeds/{id} | Get a custom feed
[**customFeedsItemsList**](CustomFeedsApi.md#customfeedsitemslist) | **GET** /custom-feeds/{id}/items | List items in a custom feed
[**customFeedsList**](CustomFeedsApi.md#customfeedslist) | **GET** /custom-feeds | List custom feeds for the current user
[**customFeedsUpdate**](CustomFeedsApi.md#customfeedsupdate) | **PATCH** /custom-feeds/{id} | Update a custom feed


# **customFeedsCreate**
> JsonObject customFeedsCreate(body)

Create a new custom feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();
final JsonObject body = Object; // JsonObject | 

try {
    final response = api.customFeedsCreate(body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsCreate: $e\n');
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

# **customFeedsDelete**
> JsonObject customFeedsDelete(id)

Delete a custom feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();
final String id = id_example; // String | 

try {
    final response = api.customFeedsDelete(id);
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsDelete: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **customFeedsGet**
> JsonObject customFeedsGet(id)

Get a custom feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();
final String id = id_example; // String | 

try {
    final response = api.customFeedsGet(id);
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **customFeedsItemsList**
> JsonObject customFeedsItemsList(id)

List items in a custom feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();
final String id = id_example; // String | 

try {
    final response = api.customFeedsItemsList(id);
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsItemsList: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **customFeedsList**
> JsonObject customFeedsList()

List custom feeds for the current user

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();

try {
    final response = api.customFeedsList();
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsList: $e\n');
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

# **customFeedsUpdate**
> JsonObject customFeedsUpdate(id, body)

Update a custom feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getCustomFeedsApi();
final String id = id_example; // String | 
final JsonObject body = Object; // JsonObject | 

try {
    final response = api.customFeedsUpdate(id, body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling CustomFeedsApi->customFeedsUpdate: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **String**|  | 
 **body** | **JsonObject**|  | 

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

