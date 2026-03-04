# asora_api_client.api.PostsApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createPost**](PostsApi.md#createpost) | **POST** /post | Create a new post


# **createPost**
> CreatePost201Response createPost(createPostRequest)

Create a new post

Create a new post.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getPostsApi();
final CreatePostRequest createPostRequest = ; // CreatePostRequest | 

try {
    final response = api.createPost(createPostRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling PostsApi->createPost: $e\n');
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

