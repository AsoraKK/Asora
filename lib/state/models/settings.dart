// ignore_for_file: public_member_api_docs

class SettingsState {
  final bool leftHandedMode;
  final bool horizontalSwipeEnabled;
  final bool hapticsEnabled;

  const SettingsState({
    this.leftHandedMode = false,
    this.horizontalSwipeEnabled = true,
    this.hapticsEnabled = true,
  });

  SettingsState copyWith({
    bool? leftHandedMode,
    bool? horizontalSwipeEnabled,
    bool? hapticsEnabled,
  }) {
    return SettingsState(
      leftHandedMode: leftHandedMode ?? this.leftHandedMode,
      horizontalSwipeEnabled:
          horizontalSwipeEnabled ?? this.horizontalSwipeEnabled,
      hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
    );
  }
}
