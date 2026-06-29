//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'appeal_vote_request.g.dart';

/// Payload for casting a community vote on an appeal.
///
/// Properties:
/// * [vote] - `uphold` keeps content removed; `deny` requests restoration
@BuiltValue()
abstract class AppealVoteRequest implements Built<AppealVoteRequest, AppealVoteRequestBuilder> {
  /// `uphold` keeps content removed; `deny` requests restoration
  @BuiltValueField(wireName: r'vote')
  AppealVoteRequestVoteEnum get vote;
  // enum voteEnum {  uphold,  deny,  };

  AppealVoteRequest._();

  factory AppealVoteRequest([void updates(AppealVoteRequestBuilder b)]) = _$AppealVoteRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AppealVoteRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AppealVoteRequest> get serializer => _$AppealVoteRequestSerializer();
}

class _$AppealVoteRequestSerializer implements PrimitiveSerializer<AppealVoteRequest> {
  @override
  final Iterable<Type> types = const [AppealVoteRequest, _$AppealVoteRequest];

  @override
  final String wireName = r'AppealVoteRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AppealVoteRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'vote';
    yield serializers.serialize(
      object.vote,
      specifiedType: const FullType(AppealVoteRequestVoteEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AppealVoteRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AppealVoteRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'vote':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(AppealVoteRequestVoteEnum),
          ) as AppealVoteRequestVoteEnum;
          result.vote = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AppealVoteRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AppealVoteRequestBuilder();
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

class AppealVoteRequestVoteEnum extends EnumClass {

  /// `uphold` keeps content removed; `deny` requests restoration
  @BuiltValueEnumConst(wireName: r'uphold')
  static const AppealVoteRequestVoteEnum uphold = _$appealVoteRequestVoteEnum_uphold;
  /// `uphold` keeps content removed; `deny` requests restoration
  @BuiltValueEnumConst(wireName: r'deny')
  static const AppealVoteRequestVoteEnum deny = _$appealVoteRequestVoteEnum_deny;

  static Serializer<AppealVoteRequestVoteEnum> get serializer => _$appealVoteRequestVoteEnumSerializer;

  const AppealVoteRequestVoteEnum._(String name): super(name);

  static BuiltSet<AppealVoteRequestVoteEnum> get values => _$appealVoteRequestVoteEnumValues;
  static AppealVoteRequestVoteEnum valueOf(String name) => _$appealVoteRequestVoteEnumValueOf(name);
}

