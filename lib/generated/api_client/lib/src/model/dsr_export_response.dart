//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:asora_api_client/src/model/dsr_export_response_previous_exports_inner.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'dsr_export_response.g.dart';

/// GDPR Article 20 data portability export payload.
///
/// Properties:
/// * [exportId] - Unique identifier for this export
/// * [exportedAt]
/// * [exportedBy] - User ID of the exporting account
/// * [userId] - User whose data is contained in this export
/// * [profile] - User profile data
/// * [posts]
/// * [comments]
/// * [bookmarks]
/// * [notifications]
/// * [previousExports]
@BuiltValue()
abstract class DSRExportResponse
    implements Built<DSRExportResponse, DSRExportResponseBuilder> {
  /// Unique identifier for this export
  @BuiltValueField(wireName: r'exportId')
  String get exportId;

  @BuiltValueField(wireName: r'exportedAt')
  DateTime get exportedAt;

  /// User ID of the exporting account
  @BuiltValueField(wireName: r'exportedBy')
  String get exportedBy;

  /// User whose data is contained in this export
  @BuiltValueField(wireName: r'userId')
  String get userId;

  /// User profile data
  @BuiltValueField(wireName: r'profile')
  BuiltMap<String, JsonObject?>? get profile;

  @BuiltValueField(wireName: r'posts')
  BuiltList<BuiltMap<String, JsonObject?>>? get posts;

  @BuiltValueField(wireName: r'comments')
  BuiltList<BuiltMap<String, JsonObject?>>? get comments;

  @BuiltValueField(wireName: r'bookmarks')
  BuiltList<BuiltMap<String, JsonObject?>>? get bookmarks;

  @BuiltValueField(wireName: r'notifications')
  BuiltList<BuiltMap<String, JsonObject?>>? get notifications;

  @BuiltValueField(wireName: r'previousExports')
  BuiltList<DSRExportResponsePreviousExportsInner>? get previousExports;

  DSRExportResponse._();

  factory DSRExportResponse([void updates(DSRExportResponseBuilder b)]) =
      _$DSRExportResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(DSRExportResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<DSRExportResponse> get serializer =>
      _$DSRExportResponseSerializer();
}

class _$DSRExportResponseSerializer
    implements PrimitiveSerializer<DSRExportResponse> {
  @override
  final Iterable<Type> types = const [DSRExportResponse, _$DSRExportResponse];

  @override
  final String wireName = r'DSRExportResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    DSRExportResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'exportId';
    yield serializers.serialize(
      object.exportId,
      specifiedType: const FullType(String),
    );
    yield r'exportedAt';
    yield serializers.serialize(
      object.exportedAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'exportedBy';
    yield serializers.serialize(
      object.exportedBy,
      specifiedType: const FullType(String),
    );
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    if (object.profile != null) {
      yield r'profile';
      yield serializers.serialize(
        object.profile,
        specifiedType: const FullType(
            BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
    if (object.posts != null) {
      yield r'posts';
      yield serializers.serialize(
        object.posts,
        specifiedType: const FullType(BuiltList, [
          FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
        ]),
      );
    }
    if (object.comments != null) {
      yield r'comments';
      yield serializers.serialize(
        object.comments,
        specifiedType: const FullType(BuiltList, [
          FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
        ]),
      );
    }
    if (object.bookmarks != null) {
      yield r'bookmarks';
      yield serializers.serialize(
        object.bookmarks,
        specifiedType: const FullType(BuiltList, [
          FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
        ]),
      );
    }
    if (object.notifications != null) {
      yield r'notifications';
      yield serializers.serialize(
        object.notifications,
        specifiedType: const FullType(BuiltList, [
          FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
        ]),
      );
    }
    if (object.previousExports != null) {
      yield r'previousExports';
      yield serializers.serialize(
        object.previousExports,
        specifiedType: const FullType(
            BuiltList, [FullType(DSRExportResponsePreviousExportsInner)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    DSRExportResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object,
            specifiedType: specifiedType)
        .toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required DSRExportResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'exportId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.exportId = valueDes;
          break;
        case r'exportedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.exportedAt = valueDes;
          break;
        case r'exportedBy':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.exportedBy = valueDes;
          break;
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'profile':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(
                BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
          ) as BuiltMap<String, JsonObject?>;
          result.profile.replace(valueDes);
          break;
        case r'posts':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(
                  BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
            ]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.posts.replace(valueDes);
          break;
        case r'comments':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(
                  BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
            ]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.comments.replace(valueDes);
          break;
        case r'bookmarks':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(
                  BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
            ]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.bookmarks.replace(valueDes);
          break;
        case r'notifications':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [
              FullType(
                  BuiltMap, [FullType(String), FullType.nullable(JsonObject)])
            ]),
          ) as BuiltList<BuiltMap<String, JsonObject?>>;
          result.notifications.replace(valueDes);
          break;
        case r'previousExports':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(
                BuiltList, [FullType(DSRExportResponsePreviousExportsInner)]),
          ) as BuiltList<DSRExportResponsePreviousExportsInner>;
          result.previousExports.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  DSRExportResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = DSRExportResponseBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}
