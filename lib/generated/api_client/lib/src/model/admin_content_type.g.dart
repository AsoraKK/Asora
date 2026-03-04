// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_content_type.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminContentType _$post = const AdminContentType._('post');
const AdminContentType _$comment = const AdminContentType._('comment');
const AdminContentType _$user = const AdminContentType._('user');

AdminContentType _$valueOf(String name) {
  switch (name) {
    case 'post':
      return _$post;
    case 'comment':
      return _$comment;
    case 'user':
      return _$user;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminContentType> _$values =
    BuiltSet<AdminContentType>(const <AdminContentType>[
  _$post,
  _$comment,
  _$user,
]);

class _$AdminContentTypeMeta {
  const _$AdminContentTypeMeta();
  AdminContentType get post => _$post;
  AdminContentType get comment => _$comment;
  AdminContentType get user => _$user;
  AdminContentType valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminContentType> get values => _$values;
}

abstract class _$AdminContentTypeMixin {
  // ignore: non_constant_identifier_names
  _$AdminContentTypeMeta get AdminContentType => const _$AdminContentTypeMeta();
}

Serializer<AdminContentType> _$adminContentTypeSerializer =
    _$AdminContentTypeSerializer();

class _$AdminContentTypeSerializer
    implements PrimitiveSerializer<AdminContentType> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'post': 'post',
    'comment': 'comment',
    'user': 'user',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'post': 'post',
    'comment': 'comment',
    'user': 'user',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminContentType];
  @override
  final String wireName = 'AdminContentType';

  @override
  Object serialize(Serializers serializers, AdminContentType object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminContentType deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminContentType.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
