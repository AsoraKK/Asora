# asora_api_client.api.SubscriptionApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**subscriptionStatus**](SubscriptionApi.md#subscriptionstatus) | **GET** /subscription/status | Get current user subscription status


# **subscriptionStatus**
> JsonObject subscriptionStatus()

Get current user subscription status

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getSubscriptionApi();

try {
    final response = api.subscriptionStatus();
    print(response);
} catch on DioException (e) {
    print('Exception when calling SubscriptionApi->subscriptionStatus: $e\n');
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

