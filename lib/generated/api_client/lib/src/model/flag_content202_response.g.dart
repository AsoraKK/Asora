// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'flag_content202_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const FlagContent202ResponseStatusEnum
    _$flagContent202ResponseStatusEnum_queued =
    const FlagContent202ResponseStatusEnum._('queued');
const FlagContent202ResponseStatusEnum
    _$flagContent202ResponseStatusEnum_received =
    const FlagContent202ResponseStatusEnum._('received');

FlagContent202ResponseStatusEnum _$flagContent202ResponseStatusEnumValueOf(
    String name) {
  switch (name) {
    case 'queued':
      return _$flagContent202ResponseStatusEnum_queued;
    case 'received':
      return _$flagContent202ResponseStatusEnum_received;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<FlagContent202ResponseStatusEnum>
    _$flagContent202ResponseStatusEnumValues = BuiltSet<
        FlagContent202ResponseStatusEnum>(const <FlagContent202ResponseStatusEnum>[
  _$flagContent202ResponseStatusEnum_queued,
  _$flagContent202ResponseStatusEnum_received,
]);

Serializer<FlagContent202ResponseStatusEnum>
    _$flagContent202ResponseStatusEnumSerializer =
    _$FlagContent202ResponseStatusEnumSerializer();

class _$FlagContent202ResponseStatusEnumSerializer
    implements PrimitiveSerializer<FlagContent202ResponseStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'queued': 'queued',
    'received': 'received',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'queued': 'queued',
    'received': 'received',
  };

  @override
  final Iterable<Type> types = const <Type>[FlagContent202ResponseStatusEnum];
  @override
  final String wireName = 'FlagContent202ResponseStatusEnum';

  @override
  Object serialize(
          Serializers serializers, FlagContent202ResponseStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  FlagContent202ResponseStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      FlagContent202ResponseStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$FlagContent202Response extends FlagContent202Response {
  @override
  final String? flagId;
  @override
  final FlagContent202ResponseStatusEnum? status;

  factory _$FlagContent202Response(
          [void Function(FlagContent202ResponseBuilder)? updates]) =>
      (FlagContent202ResponseBuilder()..update(updates))._build();

  _$FlagContent202Response._({this.flagId, this.status}) : super._();
  @override
  FlagContent202Response rebuild(
          void Function(FlagContent202ResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  FlagContent202ResponseBuilder toBuilder() =>
      FlagContent202ResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is FlagContent202Response &&
        flagId == other.flagId &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, flagId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'FlagContent202Response')
          ..add('flagId', flagId)
          ..add('status', status))
        .toString();
  }
}

class FlagContent202ResponseBuilder
    implements Builder<FlagContent202Response, FlagContent202ResponseBuilder> {
  _$FlagContent202Response? _$v;

  String? _flagId;
  String? get flagId => _$this._flagId;
  set flagId(String? flagId) => _$this._flagId = flagId;

  FlagContent202ResponseStatusEnum? _status;
  FlagContent202ResponseStatusEnum? get status => _$this._status;
  set status(FlagContent202ResponseStatusEnum? status) =>
      _$this._status = status;

  FlagContent202ResponseBuilder() {
    FlagContent202Response._defaults(this);
  }

  FlagContent202ResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _flagId = $v.flagId;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(FlagContent202Response other) {
    _$v = other as _$FlagContent202Response;
  }

  @override
  void update(void Function(FlagContent202ResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  FlagContent202Response build() => _build();

  _$FlagContent202Response _build() {
    final _$result = _$v ??
        _$FlagContent202Response._(
          flagId: flagId,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
