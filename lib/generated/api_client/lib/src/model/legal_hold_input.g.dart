// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'legal_hold_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const LegalHoldInputScopeEnum _$legalHoldInputScopeEnum_user =
    const LegalHoldInputScopeEnum._('user');
const LegalHoldInputScopeEnum _$legalHoldInputScopeEnum_post =
    const LegalHoldInputScopeEnum._('post');
const LegalHoldInputScopeEnum _$legalHoldInputScopeEnum_case_ =
    const LegalHoldInputScopeEnum._('case_');

LegalHoldInputScopeEnum _$legalHoldInputScopeEnumValueOf(String name) {
  switch (name) {
    case 'user':
      return _$legalHoldInputScopeEnum_user;
    case 'post':
      return _$legalHoldInputScopeEnum_post;
    case 'case_':
      return _$legalHoldInputScopeEnum_case_;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<LegalHoldInputScopeEnum> _$legalHoldInputScopeEnumValues =
    BuiltSet<LegalHoldInputScopeEnum>(const <LegalHoldInputScopeEnum>[
  _$legalHoldInputScopeEnum_user,
  _$legalHoldInputScopeEnum_post,
  _$legalHoldInputScopeEnum_case_,
]);

Serializer<LegalHoldInputScopeEnum> _$legalHoldInputScopeEnumSerializer =
    _$LegalHoldInputScopeEnumSerializer();

class _$LegalHoldInputScopeEnumSerializer
    implements PrimitiveSerializer<LegalHoldInputScopeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'user': 'user',
    'post': 'post',
    'case_': 'case',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'user': 'user',
    'post': 'post',
    'case': 'case_',
  };

  @override
  final Iterable<Type> types = const <Type>[LegalHoldInputScopeEnum];
  @override
  final String wireName = 'LegalHoldInputScopeEnum';

  @override
  Object serialize(Serializers serializers, LegalHoldInputScopeEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  LegalHoldInputScopeEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      LegalHoldInputScopeEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$LegalHoldInput extends LegalHoldInput {
  @override
  final LegalHoldInputScopeEnum scope;
  @override
  final String scopeId;
  @override
  final String reason;

  factory _$LegalHoldInput([void Function(LegalHoldInputBuilder)? updates]) =>
      (LegalHoldInputBuilder()..update(updates))._build();

  _$LegalHoldInput._(
      {required this.scope, required this.scopeId, required this.reason})
      : super._();
  @override
  LegalHoldInput rebuild(void Function(LegalHoldInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  LegalHoldInputBuilder toBuilder() => LegalHoldInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is LegalHoldInput &&
        scope == other.scope &&
        scopeId == other.scopeId &&
        reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, scope.hashCode);
    _$hash = $jc(_$hash, scopeId.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'LegalHoldInput')
          ..add('scope', scope)
          ..add('scopeId', scopeId)
          ..add('reason', reason))
        .toString();
  }
}

class LegalHoldInputBuilder
    implements Builder<LegalHoldInput, LegalHoldInputBuilder> {
  _$LegalHoldInput? _$v;

  LegalHoldInputScopeEnum? _scope;
  LegalHoldInputScopeEnum? get scope => _$this._scope;
  set scope(LegalHoldInputScopeEnum? scope) => _$this._scope = scope;

  String? _scopeId;
  String? get scopeId => _$this._scopeId;
  set scopeId(String? scopeId) => _$this._scopeId = scopeId;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  LegalHoldInputBuilder() {
    LegalHoldInput._defaults(this);
  }

  LegalHoldInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _scope = $v.scope;
      _scopeId = $v.scopeId;
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(LegalHoldInput other) {
    _$v = other as _$LegalHoldInput;
  }

  @override
  void update(void Function(LegalHoldInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  LegalHoldInput build() => _build();

  _$LegalHoldInput _build() {
    final _$result = _$v ??
        _$LegalHoldInput._(
          scope: BuiltValueNullFieldError.checkNotNull(
              scope, r'LegalHoldInput', 'scope'),
          scopeId: BuiltValueNullFieldError.checkNotNull(
              scopeId, r'LegalHoldInput', 'scopeId'),
          reason: BuiltValueNullFieldError.checkNotNull(
              reason, r'LegalHoldInput', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
