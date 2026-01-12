// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_content_action_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminContentActionResponse extends AdminContentActionResponse {
  @override
  final String? contentId;
  @override
  final AdminContentType? contentType;
  @override
  final AdminContentState? status;

  factory _$AdminContentActionResponse(
          [void Function(AdminContentActionResponseBuilder)? updates]) =>
      (AdminContentActionResponseBuilder()..update(updates))._build();

  _$AdminContentActionResponse._(
      {this.contentId, this.contentType, this.status})
      : super._();
  @override
  AdminContentActionResponse rebuild(
          void Function(AdminContentActionResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminContentActionResponseBuilder toBuilder() =>
      AdminContentActionResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminContentActionResponse &&
        contentId == other.contentId &&
        contentType == other.contentType &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, contentType.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminContentActionResponse')
          ..add('contentId', contentId)
          ..add('contentType', contentType)
          ..add('status', status))
        .toString();
  }
}

class AdminContentActionResponseBuilder
    implements
        Builder<AdminContentActionResponse, AdminContentActionResponseBuilder> {
  _$AdminContentActionResponse? _$v;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  AdminContentType? _contentType;
  AdminContentType? get contentType => _$this._contentType;
  set contentType(AdminContentType? contentType) =>
      _$this._contentType = contentType;

  AdminContentState? _status;
  AdminContentState? get status => _$this._status;
  set status(AdminContentState? status) => _$this._status = status;

  AdminContentActionResponseBuilder() {
    AdminContentActionResponse._defaults(this);
  }

  AdminContentActionResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentId = $v.contentId;
      _contentType = $v.contentType;
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminContentActionResponse other) {
    _$v = other as _$AdminContentActionResponse;
  }

  @override
  void update(void Function(AdminContentActionResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminContentActionResponse build() => _build();

  _$AdminContentActionResponse _build() {
    final _$result = _$v ??
        _$AdminContentActionResponse._(
          contentId: contentId,
          contentType: contentType,
          status: status,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
