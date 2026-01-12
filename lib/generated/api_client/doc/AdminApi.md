# asora_api_client.api.AdminApi

## Load the API package
```dart
import 'package:asora_api_client/api.dart';
```

All URIs are relative to *https://asora-function-dev-c3fyhqcfctdddfa2.northeurope-01.azurewebsites.net*

Method | HTTP request | Description
------------- | ------------- | -------------
[**adminAppealsApprove**](AdminApi.md#adminappealsapprove) | **POST** /_admin/appeals/{appealId}/approve | Approve an appeal
[**adminAppealsGet**](AdminApi.md#adminappealsget) | **GET** /_admin/appeals/{appealId} | Get appeal detail
[**adminAppealsList**](AdminApi.md#adminappealslist) | **GET** /_admin/appeals | List appeals queue
[**adminAppealsReject**](AdminApi.md#adminappealsreject) | **POST** /_admin/appeals/{appealId}/reject | Reject an appeal
[**adminContentBlock**](AdminApi.md#admincontentblock) | **POST** /_admin/content/{contentId}/block | Block content
[**adminContentPublish**](AdminApi.md#admincontentpublish) | **POST** /_admin/content/{contentId}/publish | Publish content
[**adminFlagsGet**](AdminApi.md#adminflagsget) | **GET** /_admin/flags/{flagId} | Get a flagged content detail
[**adminFlagsList**](AdminApi.md#adminflagslist) | **GET** /_admin/flags | List flagged content queue
[**adminFlagsResolve**](AdminApi.md#adminflagsresolve) | **POST** /_admin/flags/{flagId}/resolve | Resolve a flagged content item
[**adminInvitesBatch**](AdminApi.md#admininvitesbatch) | **POST** /_admin/invites/batch | Batch create invite codes
[**adminInvitesCreate**](AdminApi.md#admininvitescreate) | **POST** /_admin/invites | Create an invite code
[**adminInvitesGet**](AdminApi.md#admininvitesget) | **GET** /_admin/invites/{code} | Get an invite code
[**adminInvitesList**](AdminApi.md#admininviteslist) | **GET** /_admin/invites | List invite codes
[**adminInvitesRevoke**](AdminApi.md#admininvitesrevoke) | **POST** /_admin/invites/{code}/revoke | Revoke an invite code
[**adminUsersDisable**](AdminApi.md#adminusersdisable) | **POST** /_admin/users/{userId}/disable | Disable a user
[**adminUsersEnable**](AdminApi.md#adminusersenable) | **POST** /_admin/users/{userId}/enable | Enable a user
[**adminUsersSearch**](AdminApi.md#adminuserssearch) | **GET** /_admin/users/search | Search users


# **adminAppealsApprove**
> AdminAppealDecisionResponse adminAppealsApprove(appealId, adminAppealDecisionRequest)

Approve an appeal

Approves an appeal and restores content to PUBLISHED. Overrides existing outcomes.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String appealId = appealId_example; // String | Appeal identifier
final AdminAppealDecisionRequest adminAppealDecisionRequest = ; // AdminAppealDecisionRequest | 

try {
    final response = api.adminAppealsApprove(appealId, adminAppealDecisionRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminAppealsApprove: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **appealId** | **String**| Appeal identifier | 
 **adminAppealDecisionRequest** | [**AdminAppealDecisionRequest**](AdminAppealDecisionRequest.md)|  | 

### Return type

[**AdminAppealDecisionResponse**](AdminAppealDecisionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminAppealsGet**
> AdminAppealDetailResponse adminAppealsGet(appealId)

Get appeal detail

Fetch appeal detail with content and decision context.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String appealId = appealId_example; // String | Appeal identifier

try {
    final response = api.adminAppealsGet(appealId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminAppealsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **appealId** | **String**| Appeal identifier | 

### Return type

[**AdminAppealDetailResponse**](AdminAppealDetailResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminAppealsList**
> AdminAppealQueueResponse adminAppealsList(status, cursor, limit)

List appeals queue

Returns appeals awaiting admin review.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String status = status_example; // String | Filter by appeal status
final String cursor = cursor_example; // String | Cursor for pagination
final int limit = 56; // int | Number of items to return (1-100)

try {
    final response = api.adminAppealsList(status, cursor, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminAppealsList: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **String**| Filter by appeal status | [optional] 
 **cursor** | **String**| Cursor for pagination | [optional] 
 **limit** | **int**| Number of items to return (1-100) | [optional] 

### Return type

[**AdminAppealQueueResponse**](AdminAppealQueueResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminAppealsReject**
> AdminAppealDecisionResponse adminAppealsReject(appealId, adminAppealDecisionRequest)

Reject an appeal

Rejects an appeal and keeps content BLOCKED. Overrides existing outcomes.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String appealId = appealId_example; // String | Appeal identifier
final AdminAppealDecisionRequest adminAppealDecisionRequest = ; // AdminAppealDecisionRequest | 

try {
    final response = api.adminAppealsReject(appealId, adminAppealDecisionRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminAppealsReject: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **appealId** | **String**| Appeal identifier | 
 **adminAppealDecisionRequest** | [**AdminAppealDecisionRequest**](AdminAppealDecisionRequest.md)|  | 

### Return type

[**AdminAppealDecisionResponse**](AdminAppealDecisionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminContentBlock**
> AdminContentActionResponse adminContentBlock(contentId, adminContentActionRequest)

Block content

Sets content state to BLOCKED.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String contentId = contentId_example; // String | Content identifier
final AdminContentActionRequest adminContentActionRequest = ; // AdminContentActionRequest | 

try {
    final response = api.adminContentBlock(contentId, adminContentActionRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminContentBlock: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **contentId** | **String**| Content identifier | 
 **adminContentActionRequest** | [**AdminContentActionRequest**](AdminContentActionRequest.md)|  | 

### Return type

[**AdminContentActionResponse**](AdminContentActionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminContentPublish**
> AdminContentActionResponse adminContentPublish(contentId, adminContentActionRequest)

Publish content

Sets content state to PUBLISHED.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String contentId = contentId_example; // String | Content identifier
final AdminContentActionRequest adminContentActionRequest = ; // AdminContentActionRequest | 

try {
    final response = api.adminContentPublish(contentId, adminContentActionRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminContentPublish: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **contentId** | **String**| Content identifier | 
 **adminContentActionRequest** | [**AdminContentActionRequest**](AdminContentActionRequest.md)|  | 

### Return type

[**AdminContentActionResponse**](AdminContentActionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminFlagsGet**
> AdminFlagDetailResponse adminFlagsGet(flagId)

Get a flagged content detail

Fetch details for a flagged content item.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String flagId = flagId_example; // String | Flag identifier

try {
    final response = api.adminFlagsGet(flagId);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminFlagsGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **flagId** | **String**| Flag identifier | 

### Return type

[**AdminFlagDetailResponse**](AdminFlagDetailResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminFlagsList**
> AdminFlagQueueResponse adminFlagsList(status, cursor, limit)

List flagged content queue

Returns grouped flagged content for admin triage.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String status = status_example; // String | Filter by queue status
final String cursor = cursor_example; // String | Cursor for pagination
final int limit = 56; // int | Number of items to return (1-100)

try {
    final response = api.adminFlagsList(status, cursor, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminFlagsList: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **status** | **String**| Filter by queue status | [optional] 
 **cursor** | **String**| Cursor for pagination | [optional] 
 **limit** | **int**| Number of items to return (1-100) | [optional] 

### Return type

[**AdminFlagQueueResponse**](AdminFlagQueueResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminFlagsResolve**
> AdminResolveResponse adminFlagsResolve(flagId, adminFlagResolveRequest)

Resolve a flagged content item

Marks a flag as resolved with a reason code.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String flagId = flagId_example; // String | Flag identifier
final AdminFlagResolveRequest adminFlagResolveRequest = ; // AdminFlagResolveRequest | 

try {
    final response = api.adminFlagsResolve(flagId, adminFlagResolveRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminFlagsResolve: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **flagId** | **String**| Flag identifier | 
 **adminFlagResolveRequest** | [**AdminFlagResolveRequest**](AdminFlagResolveRequest.md)|  | 

### Return type

[**AdminResolveResponse**](AdminResolveResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminInvitesBatch**
> AdminInviteBatchResponse adminInvitesBatch(adminInviteBatchRequest)

Batch create invite codes

Creates multiple invite codes in a single request.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final AdminInviteBatchRequest adminInviteBatchRequest = ; // AdminInviteBatchRequest | 

try {
    final response = api.adminInvitesBatch(adminInviteBatchRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminInvitesBatch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **adminInviteBatchRequest** | [**AdminInviteBatchRequest**](AdminInviteBatchRequest.md)|  | 

### Return type

[**AdminInviteBatchResponse**](AdminInviteBatchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminInvitesCreate**
> AdminInviteResponse adminInvitesCreate(adminInviteCreateRequest)

Create an invite code

Creates a single admin invite code.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final AdminInviteCreateRequest adminInviteCreateRequest = ; // AdminInviteCreateRequest | 

try {
    final response = api.adminInvitesCreate(adminInviteCreateRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminInvitesCreate: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **adminInviteCreateRequest** | [**AdminInviteCreateRequest**](AdminInviteCreateRequest.md)|  | 

### Return type

[**AdminInviteResponse**](AdminInviteResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminInvitesGet**
> AdminInviteResponse adminInvitesGet(code)

Get an invite code

Fetch a single invite by code.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String code = code_example; // String | Invite code

try {
    final response = api.adminInvitesGet(code);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminInvitesGet: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **String**| Invite code | 

### Return type

[**AdminInviteResponse**](AdminInviteResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminInvitesList**
> AdminInviteListResponse adminInvitesList(createdBy, unused, cursor, limit)

List invite codes

Returns admin invite codes with usage metadata.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String createdBy = createdBy_example; // String | Filter by creator id
final bool unused = true; // bool | Filter for unused invites only
final String cursor = cursor_example; // String | Cursor for pagination
final int limit = 56; // int | Number of items to return (1-200)

try {
    final response = api.adminInvitesList(createdBy, unused, cursor, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminInvitesList: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **createdBy** | **String**| Filter by creator id | [optional] 
 **unused** | **bool**| Filter for unused invites only | [optional] 
 **cursor** | **String**| Cursor for pagination | [optional] 
 **limit** | **int**| Number of items to return (1-200) | [optional] 

### Return type

[**AdminInviteListResponse**](AdminInviteListResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminInvitesRevoke**
> AdminInviteRevokeResponse adminInvitesRevoke(code, adminInviteRevokeRequest)

Revoke an invite code

Revokes an invite code immediately.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String code = code_example; // String | Invite code
final AdminInviteRevokeRequest adminInviteRevokeRequest = ; // AdminInviteRevokeRequest | 

try {
    final response = api.adminInvitesRevoke(code, adminInviteRevokeRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminInvitesRevoke: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **String**| Invite code | 
 **adminInviteRevokeRequest** | [**AdminInviteRevokeRequest**](AdminInviteRevokeRequest.md)|  | [optional] 

### Return type

[**AdminInviteRevokeResponse**](AdminInviteRevokeResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminUsersDisable**
> AdminUserActionResponse adminUsersDisable(userId, adminUserDisableRequest)

Disable a user

Disables a user account immediately.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String userId = userId_example; // String | User identifier
final AdminUserDisableRequest adminUserDisableRequest = ; // AdminUserDisableRequest | 

try {
    final response = api.adminUsersDisable(userId, adminUserDisableRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminUsersDisable: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**| User identifier | 
 **adminUserDisableRequest** | [**AdminUserDisableRequest**](AdminUserDisableRequest.md)|  | 

### Return type

[**AdminUserActionResponse**](AdminUserActionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminUsersEnable**
> AdminUserActionResponse adminUsersEnable(userId, adminUserEnableRequest)

Enable a user

Re-enables a previously disabled user.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String userId = userId_example; // String | User identifier
final AdminUserEnableRequest adminUserEnableRequest = ; // AdminUserEnableRequest | 

try {
    final response = api.adminUsersEnable(userId, adminUserEnableRequest);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminUsersEnable: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **userId** | **String**| User identifier | 
 **adminUserEnableRequest** | [**AdminUserEnableRequest**](AdminUserEnableRequest.md)|  | [optional] 

### Return type

[**AdminUserActionResponse**](AdminUserActionResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **adminUsersSearch**
> AdminUserSearchResponse adminUsersSearch(q, limit)

Search users

Search by user id, handle, display name, or email.

### Example
```dart
import 'package:asora_api_client/api.dart';

final api = AsoraApiClient().getAdminApi();
final String q = q_example; // String | Search query
final int limit = 56; // int | Number of items to return (1-100)

try {
    final response = api.adminUsersSearch(q, limit);
    print(response);
} catch on DioException (e) {
    print('Exception when calling AdminApi->adminUsersSearch: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **q** | **String**| Search query | 
 **limit** | **int**| Number of items to return (1-100) | [optional] 

### Return type

[**AdminUserSearchResponse**](AdminUserSearchResponse.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

