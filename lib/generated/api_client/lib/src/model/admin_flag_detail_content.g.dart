// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_detail_content.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagDetailContent extends AdminFlagDetailContent {
  @override
  final String? contentId;
  @override
  final AdminContentType? type;
  @override
  final DateTime? createdAt;
  @override
  final AdminContentState? state;
  @override
  final String? preview;

  factory _$AdminFlagDetailContent(
          [void Function(AdminFlagDetailContentBuilder)? updates]) =>
      (AdminFlagDetailContentBuilder()..update(updates))._build();

  _$AdminFlagDetailContent._(
      {this.contentId, this.type, this.createdAt, this.state, this.preview})
      : super._();
  @override
  AdminFlagDetailContent rebuild(
          void Function(AdminFlagDetailContentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagDetailContentBuilder toBuilder() =>
      AdminFlagDetailContentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagDetailContent &&
        contentId == other.contentId &&
        type == other.type &&
        createdAt == other.createdAt &&
        state == other.state &&
        preview == other.preview;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, state.hashCode);
    _$hash = $jc(_$hash, preview.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagDetailContent')
          ..add('contentId', contentId)
          ..add('type', type)
          ..add('createdAt', createdAt)
          ..add('state', state)
          ..add('preview', preview))
        .toString();
  }
}

class AdminFlagDetailContentBuilder
    implements Builder<AdminFlagDetailContent, AdminFlagDetailContentBuilder> {
  _$AdminFlagDetailContent? _$v;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  AdminContentType? _type;
  AdminContentType? get type => _$this._type;
  set type(AdminContentType? type) => _$this._type = type;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  AdminContentState? _state;
  AdminContentState? get state => _$this._state;
  set state(AdminContentState? state) => _$this._state = state;

  String? _preview;
  String? get preview => _$this._preview;
  set preview(String? preview) => _$this._preview = preview;

  AdminFlagDetailContentBuilder() {
    AdminFlagDetailContent._defaults(this);
  }

  AdminFlagDetailContentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentId = $v.contentId;
      _type = $v.type;
      _createdAt = $v.createdAt;
      _state = $v.state;
      _preview = $v.preview;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagDetailContent other) {
    _$v = other as _$AdminFlagDetailContent;
  }

  @override
  void update(void Function(AdminFlagDetailContentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagDetailContent build() => _build();

  _$AdminFlagDetailContent _build() {
    final _$result = _$v ??
        _$AdminFlagDetailContent._(
          contentId: contentId,
          type: type,
          createdAt: createdAt,
          state: state,
          preview: preview,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
