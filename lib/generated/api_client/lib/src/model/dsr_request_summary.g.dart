// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dsr_request_summary.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_queued =
    const DsrRequestSummaryStatusEnum._('queued');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_running =
    const DsrRequestSummaryStatusEnum._('running');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_awaitingReview =
    const DsrRequestSummaryStatusEnum._('awaitingReview');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_readyToRelease =
    const DsrRequestSummaryStatusEnum._('readyToRelease');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_released =
    const DsrRequestSummaryStatusEnum._('released');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_succeeded =
    const DsrRequestSummaryStatusEnum._('succeeded');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_failed =
    const DsrRequestSummaryStatusEnum._('failed');
const DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnum_canceled =
    const DsrRequestSummaryStatusEnum._('canceled');

DsrRequestSummaryStatusEnum _$dsrRequestSummaryStatusEnumValueOf(String name) {
  switch (name) {
    case 'queued':
      return _$dsrRequestSummaryStatusEnum_queued;
    case 'running':
      return _$dsrRequestSummaryStatusEnum_running;
    case 'awaitingReview':
      return _$dsrRequestSummaryStatusEnum_awaitingReview;
    case 'readyToRelease':
      return _$dsrRequestSummaryStatusEnum_readyToRelease;
    case 'released':
      return _$dsrRequestSummaryStatusEnum_released;
    case 'succeeded':
      return _$dsrRequestSummaryStatusEnum_succeeded;
    case 'failed':
      return _$dsrRequestSummaryStatusEnum_failed;
    case 'canceled':
      return _$dsrRequestSummaryStatusEnum_canceled;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<DsrRequestSummaryStatusEnum>
    _$dsrRequestSummaryStatusEnumValues =
    BuiltSet<DsrRequestSummaryStatusEnum>(const <DsrRequestSummaryStatusEnum>[
  _$dsrRequestSummaryStatusEnum_queued,
  _$dsrRequestSummaryStatusEnum_running,
  _$dsrRequestSummaryStatusEnum_awaitingReview,
  _$dsrRequestSummaryStatusEnum_readyToRelease,
  _$dsrRequestSummaryStatusEnum_released,
  _$dsrRequestSummaryStatusEnum_succeeded,
  _$dsrRequestSummaryStatusEnum_failed,
  _$dsrRequestSummaryStatusEnum_canceled,
]);

const DsrRequestSummaryTypeEnum _$dsrRequestSummaryTypeEnum_export_ =
    const DsrRequestSummaryTypeEnum._('export_');
const DsrRequestSummaryTypeEnum _$dsrRequestSummaryTypeEnum_delete =
    const DsrRequestSummaryTypeEnum._('delete');

DsrRequestSummaryTypeEnum _$dsrRequestSummaryTypeEnumValueOf(String name) {
  switch (name) {
    case 'export_':
      return _$dsrRequestSummaryTypeEnum_export_;
    case 'delete':
      return _$dsrRequestSummaryTypeEnum_delete;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<DsrRequestSummaryTypeEnum> _$dsrRequestSummaryTypeEnumValues =
    BuiltSet<DsrRequestSummaryTypeEnum>(const <DsrRequestSummaryTypeEnum>[
  _$dsrRequestSummaryTypeEnum_export_,
  _$dsrRequestSummaryTypeEnum_delete,
]);

Serializer<DsrRequestSummaryStatusEnum>
    _$dsrRequestSummaryStatusEnumSerializer =
    _$DsrRequestSummaryStatusEnumSerializer();
Serializer<DsrRequestSummaryTypeEnum> _$dsrRequestSummaryTypeEnumSerializer =
    _$DsrRequestSummaryTypeEnumSerializer();

class _$DsrRequestSummaryStatusEnumSerializer
    implements PrimitiveSerializer<DsrRequestSummaryStatusEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'queued': 'queued',
    'running': 'running',
    'awaitingReview': 'awaiting_review',
    'readyToRelease': 'ready_to_release',
    'released': 'released',
    'succeeded': 'succeeded',
    'failed': 'failed',
    'canceled': 'canceled',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'queued': 'queued',
    'running': 'running',
    'awaiting_review': 'awaitingReview',
    'ready_to_release': 'readyToRelease',
    'released': 'released',
    'succeeded': 'succeeded',
    'failed': 'failed',
    'canceled': 'canceled',
  };

  @override
  final Iterable<Type> types = const <Type>[DsrRequestSummaryStatusEnum];
  @override
  final String wireName = 'DsrRequestSummaryStatusEnum';

  @override
  Object serialize(Serializers serializers, DsrRequestSummaryStatusEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DsrRequestSummaryStatusEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DsrRequestSummaryStatusEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$DsrRequestSummaryTypeEnumSerializer
    implements PrimitiveSerializer<DsrRequestSummaryTypeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'export_': 'export',
    'delete': 'delete',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'export': 'export_',
    'delete': 'delete',
  };

  @override
  final Iterable<Type> types = const <Type>[DsrRequestSummaryTypeEnum];
  @override
  final String wireName = 'DsrRequestSummaryTypeEnum';

  @override
  Object serialize(Serializers serializers, DsrRequestSummaryTypeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  DsrRequestSummaryTypeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      DsrRequestSummaryTypeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$DsrRequestSummary extends DsrRequestSummary {
  @override
  final String? id;
  @override
  final DsrRequestSummaryStatusEnum? status;
  @override
  final DsrRequestSummaryTypeEnum? type;
  @override
  final String? exportBlobPath;
  @override
  final DateTime? attemptedAt;

  factory _$DsrRequestSummary(
          [void Function(DsrRequestSummaryBuilder)? updates]) =>
      (DsrRequestSummaryBuilder()..update(updates))._build();

  _$DsrRequestSummary._(
      {this.id, this.status, this.type, this.exportBlobPath, this.attemptedAt})
      : super._();
  @override
  DsrRequestSummary rebuild(void Function(DsrRequestSummaryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DsrRequestSummaryBuilder toBuilder() =>
      DsrRequestSummaryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DsrRequestSummary &&
        id == other.id &&
        status == other.status &&
        type == other.type &&
        exportBlobPath == other.exportBlobPath &&
        attemptedAt == other.attemptedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, exportBlobPath.hashCode);
    _$hash = $jc(_$hash, attemptedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DsrRequestSummary')
          ..add('id', id)
          ..add('status', status)
          ..add('type', type)
          ..add('exportBlobPath', exportBlobPath)
          ..add('attemptedAt', attemptedAt))
        .toString();
  }
}

class DsrRequestSummaryBuilder
    implements Builder<DsrRequestSummary, DsrRequestSummaryBuilder> {
  _$DsrRequestSummary? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  DsrRequestSummaryStatusEnum? _status;
  DsrRequestSummaryStatusEnum? get status => _$this._status;
  set status(DsrRequestSummaryStatusEnum? status) => _$this._status = status;

  DsrRequestSummaryTypeEnum? _type;
  DsrRequestSummaryTypeEnum? get type => _$this._type;
  set type(DsrRequestSummaryTypeEnum? type) => _$this._type = type;

  String? _exportBlobPath;
  String? get exportBlobPath => _$this._exportBlobPath;
  set exportBlobPath(String? exportBlobPath) =>
      _$this._exportBlobPath = exportBlobPath;

  DateTime? _attemptedAt;
  DateTime? get attemptedAt => _$this._attemptedAt;
  set attemptedAt(DateTime? attemptedAt) => _$this._attemptedAt = attemptedAt;

  DsrRequestSummaryBuilder() {
    DsrRequestSummary._defaults(this);
  }

  DsrRequestSummaryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _status = $v.status;
      _type = $v.type;
      _exportBlobPath = $v.exportBlobPath;
      _attemptedAt = $v.attemptedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DsrRequestSummary other) {
    _$v = other as _$DsrRequestSummary;
  }

  @override
  void update(void Function(DsrRequestSummaryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DsrRequestSummary build() => _build();

  _$DsrRequestSummary _build() {
    final _$result = _$v ??
        _$DsrRequestSummary._(
          id: id,
          status: status,
          type: type,
          exportBlobPath: exportBlobPath,
          attemptedAt: attemptedAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
