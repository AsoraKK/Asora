// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_queue_status.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminQueueStatus _$OPEN = const AdminQueueStatus._('OPEN');
const AdminQueueStatus _$RESOLVED = const AdminQueueStatus._('RESOLVED');

AdminQueueStatus _$valueOf(String name) {
  switch (name) {
    case 'OPEN':
      return _$OPEN;
    case 'RESOLVED':
      return _$RESOLVED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminQueueStatus> _$values =
    BuiltSet<AdminQueueStatus>(const <AdminQueueStatus>[
  _$OPEN,
  _$RESOLVED,
]);

class _$AdminQueueStatusMeta {
  const _$AdminQueueStatusMeta();
  AdminQueueStatus get OPEN => _$OPEN;
  AdminQueueStatus get RESOLVED => _$RESOLVED;
  AdminQueueStatus valueOf(String name) => _$valueOf(name);
  BuiltSet<AdminQueueStatus> get values => _$values;
}

abstract class _$AdminQueueStatusMixin {
  // ignore: non_constant_identifier_names
  _$AdminQueueStatusMeta get AdminQueueStatus => const _$AdminQueueStatusMeta();
}

Serializer<AdminQueueStatus> _$adminQueueStatusSerializer =
    _$AdminQueueStatusSerializer();

class _$AdminQueueStatusSerializer
    implements PrimitiveSerializer<AdminQueueStatus> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'OPEN': 'OPEN',
    'RESOLVED': 'RESOLVED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'OPEN': 'OPEN',
    'RESOLVED': 'RESOLVED',
  };

  @override
  final Iterable<Type> types = const <Type>[AdminQueueStatus];
  @override
  final String wireName = 'AdminQueueStatus';

  @override
  Object serialize(Serializers serializers, AdminQueueStatus object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminQueueStatus deserialize(Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminQueueStatus.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
