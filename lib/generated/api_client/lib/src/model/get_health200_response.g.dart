// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'get_health200_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$GetHealth200Response extends GetHealth200Response {
  @override
  final bool? ok;
  @override
  final String? status;
  @override
  final DateTime? timestamp;
  @override
  final String? service;
  @override
  final String? version;

  factory _$GetHealth200Response(
          [void Function(GetHealth200ResponseBuilder)? updates]) =>
      (GetHealth200ResponseBuilder()..update(updates))._build();

  _$GetHealth200Response._(
      {this.ok, this.status, this.timestamp, this.service, this.version})
      : super._();
  @override
  GetHealth200Response rebuild(
          void Function(GetHealth200ResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  GetHealth200ResponseBuilder toBuilder() =>
      GetHealth200ResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is GetHealth200Response &&
        ok == other.ok &&
        status == other.status &&
        timestamp == other.timestamp &&
        service == other.service &&
        version == other.version;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, ok.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, timestamp.hashCode);
    _$hash = $jc(_$hash, service.hashCode);
    _$hash = $jc(_$hash, version.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'GetHealth200Response')
          ..add('ok', ok)
          ..add('status', status)
          ..add('timestamp', timestamp)
          ..add('service', service)
          ..add('version', version))
        .toString();
  }
}

class GetHealth200ResponseBuilder
    implements Builder<GetHealth200Response, GetHealth200ResponseBuilder> {
  _$GetHealth200Response? _$v;

  bool? _ok;
  bool? get ok => _$this._ok;
  set ok(bool? ok) => _$this._ok = ok;

  String? _status;
  String? get status => _$this._status;
  set status(String? status) => _$this._status = status;

  DateTime? _timestamp;
  DateTime? get timestamp => _$this._timestamp;
  set timestamp(DateTime? timestamp) => _$this._timestamp = timestamp;

  String? _service;
  String? get service => _$this._service;
  set service(String? service) => _$this._service = service;

  String? _version;
  String? get version => _$this._version;
  set version(String? version) => _$this._version = version;

  GetHealth200ResponseBuilder() {
    GetHealth200Response._defaults(this);
  }

  GetHealth200ResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _ok = $v.ok;
      _status = $v.status;
      _timestamp = $v.timestamp;
      _service = $v.service;
      _version = $v.version;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(GetHealth200Response other) {
    _$v = other as _$GetHealth200Response;
  }

  @override
  void update(void Function(GetHealth200ResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  GetHealth200Response build() => _build();

  _$GetHealth200Response _build() {
    final _$result = _$v ??
        _$GetHealth200Response._(
          ok: ok,
          status: status,
          timestamp: timestamp,
          service: service,
          version: version,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
