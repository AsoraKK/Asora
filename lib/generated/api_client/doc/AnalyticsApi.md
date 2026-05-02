# asora_api_client.api.AnalyticsApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**analyticsEventsCreate**](AnalyticsApi.md#analyticseventscreate) | **POST** /analytics/events | Ingest client-side analytics events


# **analyticsEventsCreate**
> JsonObject analyticsEventsCreate(body)

Ingest client-side analytics events

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAnalyticsApi();
final JsonObject body = Object; // JsonObject | 

try {
    final response = api.analyticsEventsCreate(body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AnalyticsApi->analyticsEventsCreate: $e\n');
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

