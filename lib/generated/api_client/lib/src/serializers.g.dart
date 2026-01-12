// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'serializers.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

Serializers _$serializers = (Serializers().toBuilder()
      ..add($AdminInvite.serializer)
      ..add(AdminAppealContent.serializer)
      ..add(AdminAppealDecisionRequest.serializer)
      ..add(AdminAppealDecisionResponse.serializer)
      ..add(AdminAppealDetail.serializer)
      ..add(AdminAppealDetailResponse.serializer)
      ..add(AdminAppealOriginalDecision.serializer)
      ..add(AdminAppealOriginalDecisionDecisionEnum.serializer)
      ..add(AdminAppealQueueItem.serializer)
      ..add(AdminAppealQueueResponse.serializer)
      ..add(AdminAppealStatus.serializer)
      ..add(AdminContentActionRequest.serializer)
      ..add(AdminContentActionResponse.serializer)
      ..add(AdminContentState.serializer)
      ..add(AdminContentType.serializer)
      ..add(AdminFlagDetailAppeal.serializer)
      ..add(AdminFlagDetailContent.serializer)
      ..add(AdminFlagDetailFlags.serializer)
      ..add(AdminFlagDetailReason.serializer)
      ..add(AdminFlagDetailResponse.serializer)
      ..add(AdminFlagHistory.serializer)
      ..add(AdminFlagHistoryAdminAction.serializer)
      ..add(AdminFlagHistoryAppeal.serializer)
      ..add(AdminFlagHistoryFlag.serializer)
      ..add(AdminFlagQueueAuthor.serializer)
      ..add(AdminFlagQueueContent.serializer)
      ..add(AdminFlagQueueFlags.serializer)
      ..add(AdminFlagQueueItem.serializer)
      ..add(AdminFlagQueueResponse.serializer)
      ..add(AdminFlagResolveRequest.serializer)
      ..add(AdminInviteBatchRequest.serializer)
      ..add(AdminInviteBatchResponse.serializer)
      ..add(AdminInviteCreateRequest.serializer)
      ..add(AdminInviteListResponse.serializer)
      ..add(AdminInviteResponse.serializer)
      ..add(AdminInviteRevokeRequest.serializer)
      ..add(AdminInviteRevokeResponse.serializer)
      ..add(AdminInviteStatus.serializer)
      ..add(AdminModerationSummary.serializer)
      ..add(AdminQueueStatus.serializer)
      ..add(AdminResolveResponse.serializer)
      ..add(AdminUserActionResponse.serializer)
      ..add(AdminUserDisableRequest.serializer)
      ..add(AdminUserEnableRequest.serializer)
      ..add(AdminUserSearchResponse.serializer)
      ..add(AdminUserStatus.serializer)
      ..add(AdminUserSummary.serializer)
      ..add(CreatePost201Response.serializer)
      ..add(CreatePost201ResponseStatusEnum.serializer)
      ..add(CreatePostRequest.serializer)
      ..add(DsrRequestInput.serializer)
      ..add(DsrRequestSummary.serializer)
      ..add(DsrRequestSummaryStatusEnum.serializer)
      ..add(DsrRequestSummaryTypeEnum.serializer)
      ..add(Error.serializer)
      ..add(FlagContent202Response.serializer)
      ..add(FlagContent202ResponseStatusEnum.serializer)
      ..add(FlagContentRequest.serializer)
      ..add(FlagContentRequestReasonEnum.serializer)
      ..add(GetFeed200Response.serializer)
      ..add(GetFeed200ResponseMeta.serializer)
      ..add(GetHealth200Response.serializer)
      ..add(LegalHoldClear.serializer)
      ..add(LegalHoldInput.serializer)
      ..add(LegalHoldInputScopeEnum.serializer)
      ..add(LegalHoldRecord.serializer)
      ..add(RateLimitError.serializer)
      ..add(RateLimitErrorErrorEnum.serializer)
      ..add(RateLimitErrorReasonEnum.serializer)
      ..add(RateLimitErrorScopeEnum.serializer)
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(AdminAppealQueueItem)]),
          () => ListBuilder<AdminAppealQueueItem>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(AdminFlagDetailReason)]),
          () => ListBuilder<AdminFlagDetailReason>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(AdminFlagHistoryFlag)]),
          () => ListBuilder<AdminFlagHistoryFlag>())
      ..addBuilderFactory(
          const FullType(
              BuiltList, const [const FullType(AdminFlagHistoryAdminAction)]),
          () => ListBuilder<AdminFlagHistoryAdminAction>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(AdminFlagQueueItem)]),
          () => ListBuilder<AdminFlagQueueItem>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(AdminInvite)]),
          () => ListBuilder<AdminInvite>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(AdminInvite)]),
          () => ListBuilder<AdminInvite>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(AdminUserSummary)]),
          () => ListBuilder<AdminUserSummary>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [
            const FullType(BuiltMap, const [
              const FullType(String),
              const FullType.nullable(JsonObject)
            ])
          ]),
          () => ListBuilder<BuiltMap<String, JsonObject?>>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(BuiltList, const [const FullType(String)]),
          () => ListBuilder<String>())
      ..addBuilderFactory(
          const FullType(
              BuiltMap, const [const FullType(String), const FullType(num)]),
          () => MapBuilder<String, num>())
      ..addBuilderFactory(
          const FullType(BuiltMap, const [
            const FullType(String),
            const FullType.nullable(JsonObject)
          ]),
          () => MapBuilder<String, JsonObject?>()))
    .build();

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
