// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'legal_hold_record.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$LegalHoldRecord extends LegalHoldRecord {
  @override
  final String? id;
  @override
  final String? scope;
  @override
  final String? scopeId;
  @override
  final String? reason;

  factory _$LegalHoldRecord([void Function(LegalHoldRecordBuilder)? updates]) =>
      (LegalHoldRecordBuilder()..update(updates))._build();

  _$LegalHoldRecord._({this.id, this.scope, this.scopeId, this.reason})
      : super._();
  @override
  LegalHoldRecord rebuild(void Function(LegalHoldRecordBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LegalHoldRecordBuilder toBuilder() => LegalHoldRecordBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LegalHoldRecord &&
        id == other.id &&
        scope == other.scope &&
        scopeId == other.scopeId &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, scope.hashCode);
    _$hash = $jc(_$hash, scopeId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LegalHoldRecord')
          ..add('id', id)
          ..add('scope', scope)
          ..add('scopeId', scopeId)
          ..add('reason', reason))
        .toString();
  }
}

class LegalHoldRecordBuilder
    implements Builder<LegalHoldRecord, LegalHoldRecordBuilder> {
  _$LegalHoldRecord? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _scope;
  String? get scope => _$this._scope;
  set scope(String? scope) => _$this._scope = scope;

  String? _scopeId;
  String? get scopeId => _$this._scopeId;
  set scopeId(String? scopeId) => _$this._scopeId = scopeId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  LegalHoldRecordBuilder() {
    LegalHoldRecord._defaults(this);
  }

  LegalHoldRecordBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _scope = $v.scope;
      _scopeId = $v.scopeId;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LegalHoldRecord other) {
    _$v = other as _$LegalHoldRecord;
  }

  @override
  void update(void Function(LegalHoldRecordBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LegalHoldRecord build() => _build();

  _$LegalHoldRecord _build() {
    final _$result = _$v ??
        _$LegalHoldRecord._(
          id: id,
          scope: scope,
          scopeId: scopeId,
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
