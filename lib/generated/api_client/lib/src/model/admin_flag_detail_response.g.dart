// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_detail_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagDetailResponse extends AdminFlagDetailResponse {
  @override
  final AdminFlagDetailContent? content;
  @override
  final AdminFlagDetailFlags? flags;
  @override
  final AdminModerationSummary? moderation;
  @override
  final AdminFlagDetailAppeal? appeal;
  @override
  final AdminFlagHistory? history;

  factory _$AdminFlagDetailResponse(
          [void Function(AdminFlagDetailResponseBuilder)? updates]) =>
      (AdminFlagDetailResponseBuilder()..update(updates))._build();

  _$AdminFlagDetailResponse._(
      {this.content, this.flags, this.moderation, this.appeal, this.history})
      : super._();
  @override
  AdminFlagDetailResponse rebuild(
          void Function(AdminFlagDetailResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagDetailResponseBuilder toBuilder() =>
      AdminFlagDetailResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagDetailResponse &&
        content == other.content &&
        flags == other.flags &&
        moderation == other.moderation &&
        appeal == other.appeal &&
        history == other.history;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, content.hashCode);
    _$hash = $jc(_$hash, flags.hashCode);
    _$hash = $jc(_$hash, moderation.hashCode);
    _$hash = $jc(_$hash, appeal.hashCode);
    _$hash = $jc(_$hash, history.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagDetailResponse')
          ..add('content', content)
          ..add('flags', flags)
          ..add('moderation', moderation)
          ..add('appeal', appeal)
          ..add('history', history))
        .toString();
  }
}

class AdminFlagDetailResponseBuilder
    implements
        Builder<AdminFlagDetailResponse, AdminFlagDetailResponseBuilder> {
  _$AdminFlagDetailResponse? _$v;

  AdminFlagDetailContentBuilder? _content;
  AdminFlagDetailContentBuilder get content =>
      _$this._content ??= AdminFlagDetailContentBuilder();
  set content(AdminFlagDetailContentBuilder? content) =>
      _$this._content = content;

  AdminFlagDetailFlagsBuilder? _flags;
  AdminFlagDetailFlagsBuilder get flags =>
      _$this._flags ??= AdminFlagDetailFlagsBuilder();
  set flags(AdminFlagDetailFlagsBuilder? flags) => _$this._flags = flags;

  AdminModerationSummaryBuilder? _moderation;
  AdminModerationSummaryBuilder get moderation =>
      _$this._moderation ??= AdminModerationSummaryBuilder();
  set moderation(AdminModerationSummaryBuilder? moderation) =>
      _$this._moderation = moderation;

  AdminFlagDetailAppealBuilder? _appeal;
  AdminFlagDetailAppealBuilder get appeal =>
      _$this._appeal ??= AdminFlagDetailAppealBuilder();
  set appeal(AdminFlagDetailAppealBuilder? appeal) => _$this._appeal = appeal;

  AdminFlagHistoryBuilder? _history;
  AdminFlagHistoryBuilder get history =>
      _$this._history ??= AdminFlagHistoryBuilder();
  set history(AdminFlagHistoryBuilder? history) => _$this._history = history;

  AdminFlagDetailResponseBuilder() {
    AdminFlagDetailResponse._defaults(this);
  }

  AdminFlagDetailResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _content = $v.content?.toBuilder();
      _flags = $v.flags?.toBuilder();
      _moderation = $v.moderation?.toBuilder();
      _appeal = $v.appeal?.toBuilder();
      _history = $v.history?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagDetailResponse other) {
    _$v = other as _$AdminFlagDetailResponse;
  }

  @override
  void update(void Function(AdminFlagDetailResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagDetailResponse build() => _build();

  _$AdminFlagDetailResponse _build() {
    _$AdminFlagDetailResponse _$result;
    try {
      _$result = _$v ??
          _$AdminFlagDetailResponse._(
            content: _content?.build(),
            flags: _flags?.build(),
            moderation: _moderation?.build(),
            appeal: _appeal?.build(),
            history: _history?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'content';
        _content?.build();
        _$failedField = 'flags';
        _flags?.build();
        _$failedField = 'moderation';
        _moderation?.build();
        _$failedField = 'appeal';
        _appeal?.build();
        _$failedField = 'history';
        _history?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagDetailResponse', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
