# asora_api_client.model.DSRExportResponse

## Load the model package
```dart
import 'package:asora_api_client/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**exportId** | **String** | Unique identifier for this export | 
**exportedAt** | [**DateTime**](DateTime.md) |  | 
**exportedBy** | **String** | User ID of the exporting account | 
**userId** | **String** | User whose data is contained in this export | 
**profile** | [**BuiltMap&lt;String, JsonObject&gt;**](JsonObject.md) | User profile data | [optional] 
**posts** | [**BuiltList&lt;BuiltMap&lt;String, JsonObject&gt;&gt;**](BuiltMap.md) |  | [optional] 
**comments** | [**BuiltList&lt;BuiltMap&lt;String, JsonObject&gt;&gt;**](BuiltMap.md) |  | [optional] 
**bookmarks** | [**BuiltList&lt;BuiltMap&lt;String, JsonObject&gt;&gt;**](BuiltMap.md) |  | [optional] 
**notifications** | [**BuiltList&lt;BuiltMap&lt;String, JsonObject&gt;&gt;**](BuiltMap.md) |  | [optional] 
**previousExports** | [**BuiltList&lt;DSRExportResponsePreviousExportsInner&gt;**](DSRExportResponsePreviousExportsInner.md) |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


