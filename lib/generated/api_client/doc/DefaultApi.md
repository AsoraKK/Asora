# asora_api_client.api.DefaultApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createPost**](DefaultApi.md#createpost) | **POST** /post | Create a new post
[**flagContent**](DefaultApi.md#flagcontent) | **POST** /moderation/flag | Flag content for moderation review
[**getFeed**](DefaultApi.md#getfeed) | **GET** /feed | Retrieve personalized feed items


# **createPost**
> CreatePost201Response createPost(createPostRequest)

Create a new post

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getDefaultApi();
final CreatePostRequest createPostRequest = ; // CreatePostRequest | 

try {
    final response = api.createPost(createPostRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->createPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **createPostRequest** | [**CreatePostRequest**](CreatePostRequest.md)|  | 

### Return type

[**CreatePost201Response**](CreatePost201Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **flagContent**
> FlagContent202Response flagContent(flagContentRequest)

Flag content for moderation review

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getDefaultApi();
final FlagContentRequest flagContentRequest = ; // FlagContentRequest | 

try {
    final response = api.flagContent(flagContentRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->flagContent: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **flagContentRequest** | [**FlagContentRequest**](FlagContentRequest.md)|  | 

### Return type

[**FlagContent202Response**](FlagContent202Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getFeed**
> GetFeed200Response getFeed(cursor, limit)

Retrieve personalized feed items

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getDefaultApi();
final String cursor = cursor_example; // String | Cursor for pagination
final int limit = 56; // int | Number of items to return (1-50)

try {
    final response = api.getFeed(cursor, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->getFeed: $e\n');
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

