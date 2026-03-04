// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_appeal_original_decision.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const AdminAppealOriginalDecisionDecisionEnum
    _$adminAppealOriginalDecisionDecisionEnum_BLOCKED =
    const AdminAppealOriginalDecisionDecisionEnum._('BLOCKED');

AdminAppealOriginalDecisionDecisionEnum
    _$adminAppealOriginalDecisionDecisionEnumValueOf(String name) {
  switch (name) {
    case 'BLOCKED':
      return _$adminAppealOriginalDecisionDecisionEnum_BLOCKED;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<AdminAppealOriginalDecisionDecisionEnum>
    _$adminAppealOriginalDecisionDecisionEnumValues = BuiltSet<
        AdminAppealOriginalDecisionDecisionEnum>(const <AdminAppealOriginalDecisionDecisionEnum>[
  _$adminAppealOriginalDecisionDecisionEnum_BLOCKED,
]);

Serializer<AdminAppealOriginalDecisionDecisionEnum>
    _$adminAppealOriginalDecisionDecisionEnumSerializer =
    _$AdminAppealOriginalDecisionDecisionEnumSerializer();

class _$AdminAppealOriginalDecisionDecisionEnumSerializer
    implements PrimitiveSerializer<AdminAppealOriginalDecisionDecisionEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'BLOCKED': 'BLOCKED',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'BLOCKED': 'BLOCKED',
  };

  @override
  final Iterable<Type> types = const <Type>[
    AdminAppealOriginalDecisionDecisionEnum
  ];
  @override
  final String wireName = 'AdminAppealOriginalDecisionDecisionEnum';

  @override
  Object serialize(Serializers serializers,
          AdminAppealOriginalDecisionDecisionEnum object,
          {FullType specifiedType = FullType.unspecified}) =>
      _toWire[object.name] ?? object.name;

  @override
  AdminAppealOriginalDecisionDecisionEnum deserialize(
          Serializers serializers, Object serialized,
          {FullType specifiedType = FullType.unspecified}) =>
      AdminAppealOriginalDecisionDecisionEnum.valueOf(
          _fromWire[serialized] ?? (serialized is String ? serialized : ''));
}

class _$AdminAppealOriginalDecision extends AdminAppealOriginalDecision {
  @override
  final AdminAppealOriginalDecisionDecisionEnum? decision;
  @override
  final BuiltList<String>? reasonCodes;
  @override
  final int? configVersionUsed;
  @override
  final DateTime? decidedAt;

  factory _$AdminAppealOriginalDecision(
          [void Function(AdminAppealOriginalDecisionBuilder)? updates]) =>
      (AdminAppealOriginalDecisionBuilder()..update(updates))._build();

  _$AdminAppealOriginalDecision._(
      {this.decision, this.reasonCodes, this.configVersionUsed, this.decidedAt})
      : super._();
  @override
  AdminAppealOriginalDecision rebuild(
          void Function(AdminAppealOriginalDecisionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAppealOriginalDecisionBuilder toBuilder() =>
      AdminAppealOriginalDecisionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAppealOriginalDecision &&
        decision == other.decision &&
        reasonCodes == other.reasonCodes &&
        configVersionUsed == other.configVersionUsed &&
        decidedAt == other.decidedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, decision.hashCode);
    _$hash = $jc(_$hash, reasonCodes.hashCode);
    _$hash = $jc(_$hash, configVersionUsed.hashCode);
    _$hash = $jc(_$hash, decidedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAppealOriginalDecision')
          ..add('decision', decision)
          ..add('reasonCodes', reasonCodes)
          ..add('configVersionUsed', configVersionUsed)
          ..add('decidedAt', decidedAt))
        .toString();
  }
}

class AdminAppealOriginalDecisionBuilder
    implements
        Builder<AdminAppealOriginalDecision,
            AdminAppealOriginalDecisionBuilder> {
  _$AdminAppealOriginalDecision? _$v;

  AdminAppealOriginalDecisionDecisionEnum? _decision;
  AdminAppealOriginalDecisionDecisionEnum? get decision => _$this._decision;
  set decision(AdminAppealOriginalDecisionDecisionEnum? decision) =>
      _$this._decision = decision;

  ListBuilder<String>? _reasonCodes;
  ListBuilder<String> get reasonCodes =>
      _$this._reasonCodes ??= ListBuilder<String>();
  set reasonCodes(ListBuilder<String>? reasonCodes) =>
      _$this._reasonCodes = reasonCodes;

  int? _configVersionUsed;
  int? get configVersionUsed => _$this._configVersionUsed;
  set configVersionUsed(int? configVersionUsed) =>
      _$this._configVersionUsed = configVersionUsed;

  DateTime? _decidedAt;
  DateTime? get decidedAt => _$this._decidedAt;
  set decidedAt(DateTime? decidedAt) => _$this._decidedAt = decidedAt;

  AdminAppealOriginalDecisionBuilder() {
    AdminAppealOriginalDecision._defaults(this);
  }

  AdminAppealOriginalDecisionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _decision = $v.decision;
      _reasonCodes = $v.reasonCodes?.toBuilder();
      _configVersionUsed = $v.configVersionUsed;
      _decidedAt = $v.decidedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAppealOriginalDecision other) {
    _$v = other as _$AdminAppealOriginalDecision;
  }

  @override
  void update(void Function(AdminAppealOriginalDecisionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAppealOriginalDecision build() => _build();

  _$AdminAppealOriginalDecision _build() {
    _$AdminAppealOriginalDecision _$result;
    try {
      _$result = _$v ??
          _$AdminAppealOriginalDecision._(
            decision: decision,
            reasonCodes: _reasonCodes?.build(),
            configVersionUsed: configVersionUsed,
            decidedAt: decidedAt,
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'reasonCodes';
        _reasonCodes?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'AdminAppealOriginalDecision', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
