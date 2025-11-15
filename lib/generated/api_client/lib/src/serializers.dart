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
import 'package:asora_api_client/src/model/legal_hold_clear.dart';
import 'package:asora_api_client/src/model/legal_hold_input.dart';
import 'package:asora_api_client/src/model/legal_hold_record.dart';
import 'package:asora_api_client/src/model/rate_limit_error.dart';

part 'serializers.g.dart';

@SerializersFor([
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
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
