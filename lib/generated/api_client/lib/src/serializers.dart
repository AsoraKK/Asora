//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_import

import 'package:one_of_serializer/any_of_serializer.dart';
import 'package:one_of_serializer/one_of_serializer.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:built_value/standard_json_plugin.dart';
import 'package:built_value/iso_8601_date_time_serializer.dart';
import 'package:asora_api_client/src/date_serializer.dart';
import 'package:asora_api_client/src/model/date.dart';

import 'package:asora_api_client/src/model/admin_appeal_audit_summary.dart';
import 'package:asora_api_client/src/model/admin_appeal_content.dart';
import 'package:asora_api_client/src/model/admin_appeal_decision_request.dart';
import 'package:asora_api_client/src/model/admin_appeal_decision_response.dart';
import 'package:asora_api_client/src/model/admin_appeal_detail.dart';
import 'package:asora_api_client/src/model/admin_appeal_detail_response.dart';
import 'package:asora_api_client/src/model/admin_appeal_final_decision.dart';
import 'package:asora_api_client/src/model/admin_appeal_original_decision.dart';
import 'package:asora_api_client/src/model/admin_appeal_override_request.dart';
import 'package:asora_api_client/src/model/admin_appeal_override_response.dart';
import 'package:asora_api_client/src/model/admin_appeal_queue_item.dart';
import 'package:asora_api_client/src/model/admin_appeal_queue_response.dart';
import 'package:asora_api_client/src/model/admin_appeal_quorum_summary.dart';
import 'package:asora_api_client/src/model/admin_appeal_status.dart';
import 'package:asora_api_client/src/model/admin_appeal_status_detail.dart';
import 'package:asora_api_client/src/model/admin_appeal_target_type.dart';
import 'package:asora_api_client/src/model/admin_appeal_vote_summary.dart';
import 'package:asora_api_client/src/model/admin_audit_entry.dart';
import 'package:asora_api_client/src/model/admin_audit_list_response.dart';
import 'package:asora_api_client/src/model/admin_content_action_request.dart';
import 'package:asora_api_client/src/model/admin_content_action_response.dart';
import 'package:asora_api_client/src/model/admin_content_state.dart';
import 'package:asora_api_client/src/model/admin_content_type.dart';
import 'package:asora_api_client/src/model/admin_flag_detail_appeal.dart';
import 'package:asora_api_client/src/model/admin_flag_detail_content.dart';
import 'package:asora_api_client/src/model/admin_flag_detail_flags.dart';
import 'package:asora_api_client/src/model/admin_flag_detail_reason.dart';
import 'package:asora_api_client/src/model/admin_flag_detail_response.dart';
import 'package:asora_api_client/src/model/admin_flag_history.dart';
import 'package:asora_api_client/src/model/admin_flag_history_admin_action.dart';
import 'package:asora_api_client/src/model/admin_flag_history_appeal.dart';
import 'package:asora_api_client/src/model/admin_flag_history_flag.dart';
import 'package:asora_api_client/src/model/admin_flag_queue_author.dart';
import 'package:asora_api_client/src/model/admin_flag_queue_content.dart';
import 'package:asora_api_client/src/model/admin_flag_queue_flags.dart';
import 'package:asora_api_client/src/model/admin_flag_queue_item.dart';
import 'package:asora_api_client/src/model/admin_flag_queue_response.dart';
import 'package:asora_api_client/src/model/admin_flag_resolve_request.dart';
import 'package:asora_api_client/src/model/admin_invite.dart';
import 'package:asora_api_client/src/model/admin_invite_batch_request.dart';
import 'package:asora_api_client/src/model/admin_invite_batch_response.dart';
import 'package:asora_api_client/src/model/admin_invite_create_request.dart';
import 'package:asora_api_client/src/model/admin_invite_list_response.dart';
import 'package:asora_api_client/src/model/admin_invite_response.dart';
import 'package:asora_api_client/src/model/admin_invite_revoke_request.dart';
import 'package:asora_api_client/src/model/admin_invite_revoke_response.dart';
import 'package:asora_api_client/src/model/admin_invite_status.dart';
import 'package:asora_api_client/src/model/admin_moderation_summary.dart';
import 'package:asora_api_client/src/model/admin_queue_status.dart';
import 'package:asora_api_client/src/model/admin_resolve_response.dart';
import 'package:asora_api_client/src/model/admin_user_action_response.dart';
import 'package:asora_api_client/src/model/admin_user_disable_request.dart';
import 'package:asora_api_client/src/model/admin_user_enable_request.dart';
import 'package:asora_api_client/src/model/admin_user_search_response.dart';
import 'package:asora_api_client/src/model/admin_user_status.dart';
import 'package:asora_api_client/src/model/admin_user_summary.dart';
import 'package:asora_api_client/src/model/create_post201_response.dart';
import 'package:asora_api_client/src/model/create_post_request.dart';
import 'package:asora_api_client/src/model/dsr_request_input.dart';
import 'package:asora_api_client/src/model/dsr_request_summary.dart';
import 'package:asora_api_client/src/model/error.dart';
import 'package:asora_api_client/src/model/flag_content202_response.dart';
import 'package:asora_api_client/src/model/flag_content_request.dart';
import 'package:asora_api_client/src/model/get_feed200_response.dart';
import 'package:asora_api_client/src/model/get_feed200_response_meta.dart';
import 'package:asora_api_client/src/model/get_health200_response.dart';
import 'package:asora_api_client/src/model/invite_validation_payload.dart';
import 'package:asora_api_client/src/model/invite_validation_response.dart';
import 'package:asora_api_client/src/model/legal_hold_clear.dart';
import 'package:asora_api_client/src/model/legal_hold_input.dart';
import 'package:asora_api_client/src/model/legal_hold_record.dart';
import 'package:asora_api_client/src/model/rate_limit_error.dart';

part 'serializers.g.dart';

@SerializersFor([
  AdminAppealAuditSummary,
  AdminAppealContent,
  AdminAppealDecisionRequest,
  AdminAppealDecisionResponse,
  AdminAppealDetail,
  AdminAppealDetailResponse,
  AdminAppealFinalDecision,
  AdminAppealOriginalDecision,
  AdminAppealOverrideRequest,
  AdminAppealOverrideResponse,
  AdminAppealQueueItem,
  AdminAppealQueueResponse,
  AdminAppealQuorumSummary,
  AdminAppealStatus,
  AdminAppealStatusDetail,
  AdminAppealTargetType,
  AdminAppealVoteSummary,
  AdminAuditEntry,
  AdminAuditListResponse,
  AdminContentActionRequest,
  AdminContentActionResponse,
  AdminContentState,
  AdminContentType,
  AdminFlagDetailAppeal,
  AdminFlagDetailContent,
  AdminFlagDetailFlags,
  AdminFlagDetailReason,
  AdminFlagDetailResponse,
  AdminFlagHistory,
  AdminFlagHistoryAdminAction,
  AdminFlagHistoryAppeal,
  AdminFlagHistoryFlag,
  AdminFlagQueueAuthor,
  AdminFlagQueueContent,
  AdminFlagQueueFlags,
  AdminFlagQueueItem,
  AdminFlagQueueResponse,
  AdminFlagResolveRequest,
  AdminInvite,$AdminInvite,
  AdminInviteBatchRequest,
  AdminInviteBatchResponse,
  AdminInviteCreateRequest,
  AdminInviteListResponse,
  AdminInviteResponse,
  AdminInviteRevokeRequest,
  AdminInviteRevokeResponse,
  AdminInviteStatus,
  AdminModerationSummary,
  AdminQueueStatus,
  AdminResolveResponse,
  AdminUserActionResponse,
  AdminUserDisableRequest,
  AdminUserEnableRequest,
  AdminUserSearchResponse,
  AdminUserStatus,
  AdminUserSummary,
  CreatePost201Response,
  CreatePostRequest,
  DsrRequestInput,
  DsrRequestSummary,
  Error,
  FlagContent202Response,
  FlagContentRequest,
  GetFeed200Response,
  GetFeed200ResponseMeta,
  GetHealth200Response,
  InviteValidationPayload,
  InviteValidationResponse,
  LegalHoldClear,
  LegalHoldInput,
  LegalHoldRecord,
  RateLimitError,
])
Serializers serializers = (_$serializers.toBuilder()
      ..addBuilderFactory(
        const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
        () => MapBuilder<String, JsonObject>(),
      )
      ..add(AdminInvite.serializer)
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
