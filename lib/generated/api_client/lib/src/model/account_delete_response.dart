//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'account_delete_response.g.dart';

/// Confirmation of account deletion.
///
/// Properties:
/// * [message] 
/// * [userId] 
/// * [deletedAt] 
/// * [alreadyDeleted] - True when the account was already in a deleted state
@BuiltValue()
abstract class AccountDeleteResponse implements Built<AccountDeleteResponse, AccountDeleteResponseBuilder> {
  @BuiltValueField(wireName: r'message')
  String get message;

  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'deletedAt')
  DateTime get deletedAt;

  /// True when the account was already in a deleted state
  @BuiltValueField(wireName: r'alreadyDeleted')
  bool? get alreadyDeleted;

  AccountDeleteResponse._();

  factory AccountDeleteResponse([void updates(AccountDeleteResponseBuilder b)]) = _$AccountDeleteResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AccountDeleteResponseBuilder b) => b
      ..alreadyDeleted = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<AccountDeleteResponse> get serializer => _$AccountDeleteResponseSerializer();
}

class _$AccountDeleteResponseSerializer implements PrimitiveSerializer<AccountDeleteResponse> {
  @override
  final Iterable<Type> types = const [AccountDeleteResponse, _$AccountDeleteResponse];

  @override
  final String wireName = r'AccountDeleteResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AccountDeleteResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'message';
    yield serializers.serialize(
      object.message,
      specifiedType: const FullType(String),
    );
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'deletedAt';
    yield serializers.serialize(
      object.deletedAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.alreadyDeleted != null) {
      yield r'alreadyDeleted';
      yield serializers.serialize(
        object.alreadyDeleted,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    AccountDeleteResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AccountDeleteResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'message':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.message = valueDes;
          break;
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'deletedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.deletedAt = valueDes;
          break;
        case r'alreadyDeleted':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.alreadyDeleted = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AccountDeleteResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AccountDeleteResponseBuilder();
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

