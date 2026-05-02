# asora_api_client.api.ModerationApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**flagContent**](ModerationApi.md#flagcontent) | **POST** /moderation/flag | Flag content for moderation review
[**flagContentV1**](ModerationApi.md#flagcontentv1) | **POST** /moderation/flag-content | Flag content for moderation review (v1 route)
[**getMyAppeals**](ModerationApi.md#getmyappeals) | **GET** /moderation/my-appeals | List the authenticated user&#39;s moderation appeals
[**moderationCasesDecision**](ModerationApi.md#moderationcasesdecision) | **POST** /moderation/cases/{id}/decision | Record a decision on a moderation case
[**moderationCasesGet**](ModerationApi.md#moderationcasesget) | **GET** /moderation/cases/{id} | Get moderation case detail
[**moderationQueueList**](ModerationApi.md#moderationqueuelist) | **GET** /moderation/queue | List moderation queue items
[**moderationReviewQueueList**](ModerationApi.md#moderationreviewqueuelist) | **GET** /moderation/review-queue | List items in the review queue
[**moderationTest**](ModerationApi.md#moderationtest) | **POST** /moderation/test | Submit content to moderation pipeline for testing
[**submitAppealV1**](ModerationApi.md#submitappealv1) | **POST** /moderation/submit-appeal | Submit a moderation appeal (v1 route)
[**submitModerationAppeal**](ModerationApi.md#submitmoderationappeal) | **POST** /moderation/appeals | Submit a moderation appeal
[**voteOnAppealV1**](ModerationApi.md#voteonappealv1) | **POST** /moderation/vote-appeal | Cast a community vote on an appeal (v1 route)
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

# **flagContentV1**
> FlagContentV1202Response flagContentV1(flagContentV1Request)

Flag content for moderation review (v1 route)

Alias of `/moderation/flag` — legacy v1 route used by the function runtime.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final FlagContentV1Request flagContentV1Request = ; // FlagContentV1Request | 

try {
    final response = api.flagContentV1(flagContentV1Request);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->flagContentV1: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **flagContentV1Request** | [**FlagContentV1Request**](FlagContentV1Request.md)|  | 

### Return type

[**FlagContentV1202Response**](FlagContentV1202Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getMyAppeals**
> GetMyAppeals200Response getMyAppeals(status, cursor)

List the authenticated user's moderation appeals

Returns all appeals filed by the calling user, ordered by creation date descending.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final String status = status_example; // String | Filter by appeal status
final String cursor = cursor_example; // String | Pagination cursor

try {
    final response = api.getMyAppeals(status, cursor);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->getMyAppeals: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **String**| Filter by appeal status | [optional] 
 **cursor** | **String**| Pagination cursor | [optional] 

### Return type

[**GetMyAppeals200Response**](GetMyAppeals200Response.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **moderationCasesDecision**
> JsonObject moderationCasesDecision(id, body)

Record a decision on a moderation case

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final String id = id_example; // String | 
final JsonObject body = Object; // JsonObject | 

try {
    final response = api.moderationCasesDecision(id, body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->moderationCasesDecision: $e\n');
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

# **moderationCasesGet**
> JsonObject moderationCasesGet(id)

Get moderation case detail

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final String id = id_example; // String | 

try {
    final response = api.moderationCasesGet(id);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->moderationCasesGet: $e\n');
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

# **moderationQueueList**
> JsonObject moderationQueueList()

List moderation queue items

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();

try {
    final response = api.moderationQueueList();
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->moderationQueueList: $e\n');
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

# **moderationReviewQueueList**
> JsonObject moderationReviewQueueList()

List items in the review queue

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();

try {
    final response = api.moderationReviewQueueList();
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->moderationReviewQueueList: $e\n');
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

# **moderationTest**
> JsonObject moderationTest(body)

Submit content to moderation pipeline for testing

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final JsonObject body = Object; // JsonObject | 

try {
    final response = api.moderationTest(body);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->moderationTest: $e\n');
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

# **submitAppealV1**
> AppealCreatedResponse submitAppealV1(moderationAppealRequest)

Submit a moderation appeal (v1 route)

Alias of `/moderation/appeals` — legacy v1 route used by the function runtime.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final ModerationAppealRequest moderationAppealRequest = ; // ModerationAppealRequest | 

try {
    final response = api.submitAppealV1(moderationAppealRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->submitAppealV1: $e\n');
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

# **voteOnAppealV1**
> AppealVoteResponse voteOnAppealV1(voteOnAppealV1Request)

Cast a community vote on an appeal (v1 route)

Alias of `/moderation/appeals/{appealId}/vote` — accepts appealId in the request body.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getModerationApi();
final VoteOnAppealV1Request voteOnAppealV1Request = ; // VoteOnAppealV1Request | 

try {
    final response = api.voteOnAppealV1(voteOnAppealV1Request);
    print(response);
} catch on DioException (e) {
    print('Exception when calling ModerationApi->voteOnAppealV1: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **voteOnAppealV1Request** | [**VoteOnAppealV1Request**](VoteOnAppealV1Request.md)|  | 

### Return type

[**AppealVoteResponse**](AppealVoteResponse.md)

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

