# asora_api_client.api.ModerationApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**flagContent**](ModerationApi.md#flagcontent) | **POST** /moderation/flag | Flag content for moderation review
[**submitModerationAppeal**](ModerationApi.md#submitmoderationappeal) | **POST** /moderation/appeals | Submit a moderation appeal
[**voteOnModerationAppeal**](ModerationApi.md#voteonmoderationappeal) | **POST** /moderation/appeals/{appealId}/vote | Cast a community vote on an appeal


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

# **submitModerationAppeal**
> AppealCreatedResponse submitModerationAppeal(moderationAppealRequest)

Submit a moderation appeal

File an appeal against a moderation decision. Authenticated users with active accounts may appeal content removals. Daily appeal limits are tier-gated. 

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final ModerationAppealRequest moderationAppealRequest = {"caseId":"case_01HZPQ2B3C4D5E6F7G8H9JABCD","statement":"I believe this was flagged in error because...","evidenceUrls":["https://example.com/evidence/screenshot.png"]}; // ModerationAppealRequest | 

try {
    final response = api.submitModerationAppeal(moderationAppealRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->submitModerationAppeal: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **moderationAppealRequest** | [**ModerationAppealRequest**](ModerationAppealRequest.md)|  | 

### Return type

[**AppealCreatedResponse**](AppealCreatedResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **voteOnModerationAppeal**
> AppealVoteResponse voteOnModerationAppeal(appealId, appealVoteRequest)

Cast a community vote on an appeal

Authenticated community members may cast a weighted vote (`uphold` or `deny`) on an open appeal. Duplicate votes are rejected. Vote eligibility and quorum rules are enforced server-side. 

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final String appealId = appealId_example; // String | Appeal identifier
final AppealVoteRequest appealVoteRequest = {"vote":"uphold"}; // AppealVoteRequest | 

try {
    final response = api.voteOnModerationAppeal(appealId, appealVoteRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->voteOnModerationAppeal: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **appealId** | **String**| Appeal identifier | 
 **appealVoteRequest** | [**AppealVoteRequest**](AppealVoteRequest.md)|  | 

### Return type

[**AppealVoteResponse**](AppealVoteResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

