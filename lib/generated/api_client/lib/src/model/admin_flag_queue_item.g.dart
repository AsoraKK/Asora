// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_queue_item.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagQueueItem extends AdminFlagQueueItem {
  @override
  final AdminFlagQueueContent content;
  @override
  final AdminFlagQueueAuthor author;
  @override
  final AdminFlagQueueFlags flags;
  @override
  final AdminContentState state;
  @override
  final AdminModerationSummary? moderation;
  @override
  final AdminQueueStatus status;

  factory _$AdminFlagQueueItem(
          [void Function(AdminFlagQueueItemBuilder)? updates]) =>
      (AdminFlagQueueItemBuilder()..update(updates))._build();

  _$AdminFlagQueueItem._(
      {required this.content,
      required this.author,
      required this.flags,
      required this.state,
      this.moderation,
      required this.status})
      : super._();
  @override
  AdminFlagQueueItem rebuild(
          void Function(AdminFlagQueueItemBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagQueueItemBuilder toBuilder() =>
      AdminFlagQueueItemBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagQueueItem &&
        content == other.content &&
        author == other.author &&
        flags == other.flags &&
        state == other.state &&
        moderation == other.moderation &&
        status == other.status;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, content.hashCode);
    _$hash = $jc(_$hash, author.hashCode);
    _$hash = $jc(_$hash, flags.hashCode);
    _$hash = $jc(_$hash, state.hashCode);
    _$hash = $jc(_$hash, moderation.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagQueueItem')
          ..add('content', content)
          ..add('author', author)
          ..add('flags', flags)
          ..add('state', state)
          ..add('moderation', moderation)
          ..add('status', status))
        .toString();
  }
}

class AdminFlagQueueItemBuilder
    implements Builder<AdminFlagQueueItem, AdminFlagQueueItemBuilder> {
  _$AdminFlagQueueItem? _$v;

  AdminFlagQueueContentBuilder? _content;
  AdminFlagQueueContentBuilder get content =>
      _$this._content ??= AdminFlagQueueContentBuilder();
  set content(AdminFlagQueueContentBuilder? content) =>
      _$this._content = content;

  AdminFlagQueueAuthorBuilder? _author;
  AdminFlagQueueAuthorBuilder get author =>
      _$this._author ??= AdminFlagQueueAuthorBuilder();
  set author(AdminFlagQueueAuthorBuilder? author) => _$this._author = author;

  AdminFlagQueueFlagsBuilder? _flags;
  AdminFlagQueueFlagsBuilder get flags =>
      _$this._flags ??= AdminFlagQueueFlagsBuilder();
  set flags(AdminFlagQueueFlagsBuilder? flags) => _$this._flags = flags;

  AdminContentState? _state;
  AdminContentState? get state => _$this._state;
  set state(AdminContentState? state) => _$this._state = state;

  AdminModerationSummaryBuilder? _moderation;
  AdminModerationSummaryBuilder get moderation =>
      _$this._moderation ??= AdminModerationSummaryBuilder();
  set moderation(AdminModerationSummaryBuilder? moderation) =>
      _$this._moderation = moderation;

  AdminQueueStatus? _status;
  AdminQueueStatus? get status => _$this._status;
  set status(AdminQueueStatus? status) => _$this._status = status;

  AdminFlagQueueItemBuilder() {
    AdminFlagQueueItem._defaults(this);
  }

  AdminFlagQueueItemBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _content = $v.content.toBuilder();
      _author = $v.author.toBuilder();
      _flags = $v.flags.toBuilder();
      _state = $v.state;
      _moderation = $v.moderation?.toBuilder();
      _status = $v.status;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagQueueItem other) {
    _$v = other as _$AdminFlagQueueItem;
  }

  @override
  void update(void Function(AdminFlagQueueItemBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagQueueItem build() => _build();

  _$AdminFlagQueueItem _build() {
    _$AdminFlagQueueItem _$result;
    try {
      _$result = _$v ??
          _$AdminFlagQueueItem._(
            content: content.build(),
            author: author.build(),
            flags: flags.build(),
            state: BuiltValueNullFieldError.checkNotNull(
                state, r'AdminFlagQueueItem', 'state'),
            moderation: _moderation?.build(),
            status: BuiltValueNullFieldError.checkNotNull(
                status, r'AdminFlagQueueItem', 'status'),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'content';
        content.build();
        _$failedField = 'author';
        author.build();
        _$failedField = 'flags';
        flags.build();

        _$failedField = 'moderation';
        _moderation?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminFlagQueueItem', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
