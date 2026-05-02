# asora_api_client.api.FeedApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**feedDiscover**](FeedApi.md#feeddiscover) | **GET** /feed/discover | Return discovery/explore feed
[**feedNews**](FeedApi.md#feednews) | **GET** /feed/news | Return news board feed
[**feedUser**](FeedApi.md#feeduser) | **GET** /feed/user/{userId} | Return a public user&#39;s post feed
[**getFeed**](FeedApi.md#getfeed) | **GET** /feed | Retrieve personalized feed items


# **feedDiscover**
> JsonObject feedDiscover()

Return discovery/explore feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getFeedApi();

try {
    final response = api.feedDiscover();
    print(response);
} catch on DioException (e) {
    print('Exception when calling FeedApi->feedDiscover: $e\n');
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

# **feedNews**
> JsonObject feedNews()

Return news board feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getFeedApi();

try {
    final response = api.feedNews();
    print(response);
} catch on DioException (e) {
    print('Exception when calling FeedApi->feedNews: $e\n');
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

# **feedUser**
> JsonObject feedUser(userId)

Return a public user's post feed

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getFeedApi();
final String userId = userId_example; // String | 

try {
    final response = api.feedUser(userId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling FeedApi->feedUser: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**|  | 

### Return type

[**JsonObject**](JsonObject.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getFeed**
> FeedPageResponse getFeed(cursor, limit)

Retrieve personalized feed items

Return a page of feed items.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getFeedApi();
final String cursor = eyJsYXN0SWQiOiIwMThiMjdkNC01YjNiLTczZTMtYmY3Ny1iZjdiYjk1MzBmMjEiLCJ0cyI6MTcxNDQ3ODQwMH0; // String | Opaque pagination cursor returned in the previous response's `meta.nextCursor`
final int limit = 25; // int | Maximum number of items to return per page

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
 **cursor** | **String**| Opaque pagination cursor returned in the previous response's `meta.nextCursor` | [optional] 
 **limit** | **int**| Maximum number of items to return per page | [optional] [default to 25]

### Return type

[**FeedPageResponse**](FeedPageResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

