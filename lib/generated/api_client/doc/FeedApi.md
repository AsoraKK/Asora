# asora_api_client.api.FeedApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getFeed**](FeedApi.md#getfeed) | **GET** /feed | Retrieve personalized feed items


# **getFeed**
> GetFeed200Response getFeed(cursor, limit)

Retrieve personalized feed items

Return a page of feed items.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getFeedApi();
final String cursor = cursor_example; // String | Cursor for pagination
final int limit = 56; // int | Number of items to return (1-50)

try {
    final response = api.getFeed(cursor, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling FeedApi->getFeed: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **cursor** | **String**| Cursor for pagination | [optional] 
 **limit** | **int**| Number of items to return (1-50) | [optional] 

### Return type

[**GetFeed200Response**](GetFeed200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

