// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_detail_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealDetailResponse extends AdminAppealDetailResponse {
  @override
  final AdminAppealDetail? appeal;
  @override
  final AdminAppealContent? content;
  @override
  final AdminAppealOriginalDecision? originalDecision;

  factory _$AdminAppealDetailResponse(
          [void Function(AdminAppealDetailResponseBuilder)? updates]) =>
      (AdminAppealDetailResponseBuilder()..update(updates))._build();

  _$AdminAppealDetailResponse._(
      {this.appeal, this.content, this.originalDecision})
      : super._();
  @override
  AdminAppealDetailResponse rebuild(
          void Function(AdminAppealDetailResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealDetailResponseBuilder toBuilder() =>
      AdminAppealDetailResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealDetailResponse &&
        appeal == other.appeal &&
        content == other.content &&
        originalDecision == other.originalDecision;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, appeal.hashCode);
    _$hash = $jc(_$hash, content.hashCode);
    _$hash = $jc(_$hash, originalDecision.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealDetailResponse')
          ..add('appeal', appeal)
          ..add('content', content)
          ..add('originalDecision', originalDecision))
        .toString();
  }
}

class AdminAppealDetailResponseBuilder
    implements
        Builder<AdminAppealDetailResponse, AdminAppealDetailResponseBuilder> {
  _$AdminAppealDetailResponse? _$v;

  AdminAppealDetailBuilder? _appeal;
  AdminAppealDetailBuilder get appeal =>
      _$this._appeal ??= AdminAppealDetailBuilder();
  set appeal(AdminAppealDetailBuilder? appeal) => _$this._appeal = appeal;

  AdminAppealContentBuilder? _content;
  AdminAppealContentBuilder get content =>
      _$this._content ??= AdminAppealContentBuilder();
  set content(AdminAppealContentBuilder? content) => _$this._content = content;

  AdminAppealOriginalDecisionBuilder? _originalDecision;
  AdminAppealOriginalDecisionBuilder get originalDecision =>
      _$this._originalDecision ??= AdminAppealOriginalDecisionBuilder();
  set originalDecision(AdminAppealOriginalDecisionBuilder? originalDecision) =>
      _$this._originalDecision = originalDecision;

  AdminAppealDetailResponseBuilder() {
    AdminAppealDetailResponse._defaults(this);
  }

  AdminAppealDetailResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _appeal = $v.appeal?.toBuilder();
      _content = $v.content?.toBuilder();
      _originalDecision = $v.originalDecision?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealDetailResponse other) {
    _$v = other as _$AdminAppealDetailResponse;
  }

  @override
  void update(void Function(AdminAppealDetailResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealDetailResponse build() => _build();

  _$AdminAppealDetailResponse _build() {
    _$AdminAppealDetailResponse _$result;
    try {
      _$result = _$v ??
          _$AdminAppealDetailResponse._(
            appeal: _appeal?.build(),
            content: _content?.build(),
            originalDecision: _originalDecision?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'appeal';
        _appeal?.build();
        _$failedField = 'content';
        _content?.build();
        _$failedField = 'originalDecision';
        _originalDecision?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminAppealDetailResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
