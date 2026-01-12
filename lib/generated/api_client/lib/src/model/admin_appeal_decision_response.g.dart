// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_decision_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealDecisionResponse extends AdminAppealDecisionResponse {
  @override
  final String? appealId;
  @override
  final AdminAppealStatus? status;
  @override
  final String? contentId;
  @override
  final AdminContentState? contentStatus;

  factory _$AdminAppealDecisionResponse(
          [void Function(AdminAppealDecisionResponseBuilder)? updates]) =>
      (AdminAppealDecisionResponseBuilder()..update(updates))._build();

  _$AdminAppealDecisionResponse._(
      {this.appealId, this.status, this.contentId, this.contentStatus})
      : super._();
  @override
  AdminAppealDecisionResponse rebuild(
          void Function(AdminAppealDecisionResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealDecisionResponseBuilder toBuilder() =>
      AdminAppealDecisionResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealDecisionResponse &&
        appealId == other.appealId &&
        status == other.status &&
        contentId == other.contentId &&
        contentStatus == other.contentStatus;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, appealId.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, contentStatus.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealDecisionResponse')
          ..add('appealId', appealId)
          ..add('status', status)
          ..add('contentId', contentId)
          ..add('contentStatus', contentStatus))
        .toString();
  }
}

class AdminAppealDecisionResponseBuilder
    implements
        Builder<AdminAppealDecisionResponse,
            AdminAppealDecisionResponseBuilder> {
  _$AdminAppealDecisionResponse? _$v;

  String? _appealId;
  String? get appealId => _$this._appealId;
  set appealId(String? appealId) => _$this._appealId = appealId;

  AdminAppealStatus? _status;
  AdminAppealStatus? get status => _$this._status;
  set status(AdminAppealStatus? status) => _$this._status = status;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  AdminContentState? _contentStatus;
  AdminContentState? get contentStatus => _$this._contentStatus;
  set contentStatus(AdminContentState? contentStatus) =>
      _$this._contentStatus = contentStatus;

  AdminAppealDecisionResponseBuilder() {
    AdminAppealDecisionResponse._defaults(this);
  }

  AdminAppealDecisionResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _appealId = $v.appealId;
      _status = $v.status;
      _contentId = $v.contentId;
      _contentStatus = $v.contentStatus;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealDecisionResponse other) {
    _$v = other as _$AdminAppealDecisionResponse;
  }

  @override
  void update(void Function(AdminAppealDecisionResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealDecisionResponse build() => _build();

  _$AdminAppealDecisionResponse _build() {
    final _$result = _$v ??
        _$AdminAppealDecisionResponse._(
          appealId: appealId,
          status: status,
          contentId: contentId,
          contentStatus: contentStatus,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
