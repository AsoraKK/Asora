// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_content_state.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminContentState _$PUBLISHED = const AdminContentState._('PUBLISHED');
const AdminContentState _$BLOCKED = const AdminContentState._('BLOCKED');

AdminContentState _$valueOf(String name) {
  switch (name) {
    case 'PUBLISHED':
      return _$PUBLISHED;
    case 'BLOCKED':
      return _$BLOCKED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminContentState> _$values =
    BuiltSet<AdminContentState>(const <AdminContentState>[
  _$PUBLISHED,
  _$BLOCKED,
]);

class _$AdminContentStateMeta {
  const _$AdminContentStateMeta();
  AdminContentState get PUBLISHED => _$PUBLISHED;
  AdminContentState get BLOCKED => _$BLOCKED;
  AdminContentState valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminContentState> get values => _$values;
}

abstract class _$AdminContentStateMixin {
  // ignore: non_constant_identifier_names
  _$AdminContentStateMeta get AdminContentState =>
      const _$AdminContentStateMeta();
}

Serializer<AdminContentState> _$adminContentStateSerializer =
    _$AdminContentStateSerializer();

class _$AdminContentStateSerializer
    implements PrimitiveSerializer<AdminContentState> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'PUBLISHED': 'PUBLISHED',
    'BLOCKED': 'BLOCKED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'PUBLISHED': 'PUBLISHED',
    'BLOCKED': 'BLOCKED',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminContentState];
  @override
  final String wireName = 'AdminContentState';

  @override
  Object serialize(Serializers serializers, AdminContentState object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminContentState deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminContentState.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
