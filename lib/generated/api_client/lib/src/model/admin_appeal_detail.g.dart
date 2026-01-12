// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_detail.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAppealDetail extends AdminAppealDetail {
  @override
  final String? appealId;
  @override
  final String? contentId;
  @override
  final String? authorId;
  @override
  final DateTime? submittedAt;
  @override
  final AdminAppealStatus? status;
  @override
  final String? appealType;
  @override
  final String? appealReason;
  @override
  final String? userStatement;
  @override
  final BuiltList<String>? evidenceUrls;
  @override
  final String? internalNote;

  factory _$AdminAppealDetail(
          [void Function(AdminAppealDetailBuilder)? updates]) =>
      (AdminAppealDetailBuilder()..update(updates))._build();

  _$AdminAppealDetail._(
      {this.appealId,
      this.contentId,
      this.authorId,
      this.submittedAt,
      this.status,
      this.appealType,
      this.appealReason,
      this.userStatement,
      this.evidenceUrls,
      this.internalNote})
      : super._();
  @override
  AdminAppealDetail rebuild(void Function(AdminAppealDetailBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealDetailBuilder toBuilder() =>
      AdminAppealDetailBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealDetail &&
        appealId == other.appealId &&
        contentId == other.contentId &&
        authorId == other.authorId &&
        submittedAt == other.submittedAt &&
        status == other.status &&
        appealType == other.appealType &&
        appealReason == other.appealReason &&
        userStatement == other.userStatement &&
        evidenceUrls == other.evidenceUrls &&
        internalNote == other.internalNote;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, appealId.hashCode);
    _$hash = $jc(_$hash, contentId.hashCode);
    _$hash = $jc(_$hash, authorId.hashCode);
    _$hash = $jc(_$hash, submittedAt.hashCode);
    _$hash = $jc(_$hash, status.hashCode);
    _$hash = $jc(_$hash, appealType.hashCode);
    _$hash = $jc(_$hash, appealReason.hashCode);
    _$hash = $jc(_$hash, userStatement.hashCode);
    _$hash = $jc(_$hash, evidenceUrls.hashCode);
    _$hash = $jc(_$hash, internalNote.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealDetail')
          ..add('appealId', appealId)
          ..add('contentId', contentId)
          ..add('authorId', authorId)
          ..add('submittedAt', submittedAt)
          ..add('status', status)
          ..add('appealType', appealType)
          ..add('appealReason', appealReason)
          ..add('userStatement', userStatement)
          ..add('evidenceUrls', evidenceUrls)
          ..add('internalNote', internalNote))
        .toString();
  }
}

class AdminAppealDetailBuilder
    implements Builder<AdminAppealDetail, AdminAppealDetailBuilder> {
  _$AdminAppealDetail? _$v;

  String? _appealId;
  String? get appealId => _$this._appealId;
  set appealId(String? appealId) => _$this._appealId = appealId;

  String? _contentId;
  String? get contentId => _$this._contentId;
  set contentId(String? contentId) => _$this._contentId = contentId;

  String? _authorId;
  String? get authorId => _$this._authorId;
  set authorId(String? authorId) => _$this._authorId = authorId;

  DateTime? _submittedAt;
  DateTime? get submittedAt => _$this._submittedAt;
  set submittedAt(DateTime? submittedAt) => _$this._submittedAt = submittedAt;

  AdminAppealStatus? _status;
  AdminAppealStatus? get status => _$this._status;
  set status(AdminAppealStatus? status) => _$this._status = status;

  String? _appealType;
  String? get appealType => _$this._appealType;
  set appealType(String? appealType) => _$this._appealType = appealType;

  String? _appealReason;
  String? get appealReason => _$this._appealReason;
  set appealReason(String? appealReason) => _$this._appealReason = appealReason;

  String? _userStatement;
  String? get userStatement => _$this._userStatement;
  set userStatement(String? userStatement) =>
      _$this._userStatement = userStatement;

  ListBuilder<String>? _evidenceUrls;
  ListBuilder<String> get evidenceUrls =>
      _$this._evidenceUrls ??= ListBuilder<String>();
  set evidenceUrls(ListBuilder<String>? evidenceUrls) =>
      _$this._evidenceUrls = evidenceUrls;

  String? _internalNote;
  String? get internalNote => _$this._internalNote;
  set internalNote(String? internalNote) => _$this._internalNote = internalNote;

  AdminAppealDetailBuilder() {
    AdminAppealDetail._defaults(this);
  }

  AdminAppealDetailBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _appealId = $v.appealId;
      _contentId = $v.contentId;
      _authorId = $v.authorId;
      _submittedAt = $v.submittedAt;
      _status = $v.status;
      _appealType = $v.appealType;
      _appealReason = $v.appealReason;
      _userStatement = $v.userStatement;
      _evidenceUrls = $v.evidenceUrls?.toBuilder();
      _internalNote = $v.internalNote;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealDetail other) {
    _$v = other as _$AdminAppealDetail;
  }

  @override
  void update(void Function(AdminAppealDetailBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealDetail build() => _build();

  _$AdminAppealDetail _build() {
    _$AdminAppealDetail _$result;
    try {
      _$result = _$v ??
          _$AdminAppealDetail._(
            appealId: appealId,
            contentId: contentId,
            authorId: authorId,
            submittedAt: submittedAt,
            status: status,
            appealType: appealType,
            appealReason: appealReason,
            userStatement: userStatement,
            evidenceUrls: _evidenceUrls?.build(),
            internalNote: internalNote,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'evidenceUrls';
        _evidenceUrls?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminAppealDetail', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
