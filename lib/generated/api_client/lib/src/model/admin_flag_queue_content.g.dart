// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_queue_content.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagQueueContent extends AdminFlagQueueContent {
  @override
  final String? contentId;
  @override
  final AdminContentType? type;
  @override
  final DateTime? createdAt;
  @override
  final String? preview;

  factory _$AdminFlagQueueContent(
          [void Function(AdminFlagQueueContentBuilder)? updates]) =>
      (AdminFlagQueueContentBuilder()..update(updates))._build();

  _$AdminFlagQueueContent._(
      {this.contentId, this.type, this.createdAt, this.preview})
      : super._();
  @override
  AdminFlagQueueContent rebuild(
          void Function(AdminFlagQueueContentBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagQueueContentBuilder toBuilder() =>
      AdminFlagQueueContentBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagQueueContent &&
        contentId == other.contentId &&
        type == other.type &&
        createdAt == other.createdAt &&
        preview == other.preview;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, preview.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagQueueContent')
          ..add('contentId', contentId)
          ..add('type', type)
          ..add('createdAt', createdAt)
          ..add('preview', preview))
        .toString();
  }
}

class AdminFlagQueueContentBuilder
    implements Builder<AdminFlagQueueContent, AdminFlagQueueContentBuilder> {
  _$AdminFlagQueueContent? _$v;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  AdminContentType? _type;
  AdminContentType? get type => _$this._type;
  set type(AdminContentType? type) => _$this._type = type;

  DateTime? _createdAt;
  DateTime? get createdAt => _$this._createdAt;
  set createdAt(DateTime? createdAt) => _$this._createdAt = createdAt;

  String? _preview;
  String? get preview => _$this._preview;
  set preview(String? preview) => _$this._preview = preview;

  AdminFlagQueueContentBuilder() {
    AdminFlagQueueContent._defaults(this);
  }

  AdminFlagQueueContentBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _contentId = $v.contentId;
      _type = $v.type;
      _createdAt = $v.createdAt;
      _preview = $v.preview;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagQueueContent other) {
    _$v = other as _$AdminFlagQueueContent;
  }

  @override
  void update(void Function(AdminFlagQueueContentBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagQueueContent build() => _build();

  _$AdminFlagQueueContent _build() {
    final _$result = _$v ??
        _$AdminFlagQueueContent._(
          contentId: contentId,
          type: type,
          createdAt: createdAt,
          preview: preview,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
