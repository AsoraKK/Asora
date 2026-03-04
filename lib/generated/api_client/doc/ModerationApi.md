# asora_api_client.api.ModerationApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**flagContent**](ModerationApi.md#flagcontent) | **POST** /moderation/flag | Flag content for moderation review


# **flagContent**
> FlagContent202Response flagContent(flagContentRequest)

Flag content for moderation review

Flag content for review.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final FlagContentRequest flagContentRequest = ; // FlagContentRequest | 

try {
    final response = api.flagContent(flagContentRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->flagContent: $e\n');
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

