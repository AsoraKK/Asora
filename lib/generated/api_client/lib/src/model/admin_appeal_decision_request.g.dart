// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_decision_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealDecisionRequest extends AdminAppealDecisionRequest {
  @override
  final String reasonCode;
  @override
  final String? note;

  factory _$AdminAppealDecisionRequest(
          [void Function(AdminAppealDecisionRequestBuilder)? updates]) =>
      (AdminAppealDecisionRequestBuilder()..update(updates))._build();

  _$AdminAppealDecisionRequest._({required this.reasonCode, this.note})
      : super._();
  @override
  AdminAppealDecisionRequest rebuild(
          void Function(AdminAppealDecisionRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealDecisionRequestBuilder toBuilder() =>
      AdminAppealDecisionRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealDecisionRequest &&
        reasonCode == other.reasonCode &&
        note == other.note;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reasonCode.hashCode);
    _$hash = $jc(_$hash, note.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealDecisionRequest')
          ..add('reasonCode', reasonCode)
          ..add('note', note))
        .toString();
  }
}

class AdminAppealDecisionRequestBuilder
    implements
        Builder<AdminAppealDecisionRequest, AdminAppealDecisionRequestBuilder> {
  _$AdminAppealDecisionRequest? _$v;

  String? _reasonCode;
  String? get reasonCode => _$this._reasonCode;
  set reasonCode(String? reasonCode) => _$this._reasonCode = reasonCode;

  String? _note;
  String? get note => _$this._note;
  set note(String? note) => _$this._note = note;

  AdminAppealDecisionRequestBuilder() {
    AdminAppealDecisionRequest._defaults(this);
  }

  AdminAppealDecisionRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reasonCode = $v.reasonCode;
      _note = $v.note;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealDecisionRequest other) {
    _$v = other as _$AdminAppealDecisionRequest;
  }

  @override
  void update(void Function(AdminAppealDecisionRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealDecisionRequest build() => _build();

  _$AdminAppealDecisionRequest _build() {
    final _$result = _$v ??
        _$AdminAppealDecisionRequest._(
          reasonCode: BuiltValueNullFieldError.checkNotNull(
              reasonCode, r'AdminAppealDecisionRequest', 'reasonCode'),
          note: note,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
