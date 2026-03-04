// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_flag_queue_author.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminFlagQueueAuthor extends AdminFlagQueueAuthor {
  @override
  final String? authorId;
  @override
  final String? displayName;
  @override
  final String? handle;

  factory _$AdminFlagQueueAuthor(
          [void Function(AdminFlagQueueAuthorBuilder)? updates]) =>
      (AdminFlagQueueAuthorBuilder()..update(updates))._build();

  _$AdminFlagQueueAuthor._({this.authorId, this.displayName, this.handle})
      : super._();
  @override
  AdminFlagQueueAuthor rebuild(
          void Function(AdminFlagQueueAuthorBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminFlagQueueAuthorBuilder toBuilder() =>
      AdminFlagQueueAuthorBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminFlagQueueAuthor &&
        authorId == other.authorId &&
        displayName == other.displayName &&
        handle == other.handle;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, authorId.hashCode);
    _$hash = $jc(_$hash, displayName.hashCode);
    _$hash = $jc(_$hash, handle.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminFlagQueueAuthor')
          ..add('authorId', authorId)
          ..add('displayName', displayName)
          ..add('handle', handle))
        .toString();
  }
}

class AdminFlagQueueAuthorBuilder
    implements Builder<AdminFlagQueueAuthor, AdminFlagQueueAuthorBuilder> {
  _$AdminFlagQueueAuthor? _$v;

  String? _authorId;
  String? get authorId => _$this._authorId;
  set authorId(String? authorId) => _$this._authorId = authorId;

  String? _displayName;
  String? get displayName => _$this._displayName;
  set displayName(String? displayName) => _$this._displayName = displayName;

  String? _handle;
  String? get handle => _$this._handle;
  set handle(String? handle) => _$this._handle = handle;

  AdminFlagQueueAuthorBuilder() {
    AdminFlagQueueAuthor._defaults(this);
  }

  AdminFlagQueueAuthorBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _authorId = $v.authorId;
      _displayName = $v.displayName;
      _handle = $v.handle;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminFlagQueueAuthor other) {
    _$v = other as _$AdminFlagQueueAuthor;
  }

  @override
  void update(void Function(AdminFlagQueueAuthorBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminFlagQueueAuthor build() => _build();

  _$AdminFlagQueueAuthor _build() {
    final _$result = _$v ??
        _$AdminFlagQueueAuthor._(
          authorId: authorId,
          displayName: displayName,
          handle: handle,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
