// ignore_for_file: public_member_api_docs

class SettingsState {
  final bool leftHandedMode;
  final bool horizontalSwipeEnabled;
  final bool hapticsEnabled;
  final String trustPassportVisibility;

  const SettingsState({
    this.leftHandedMode = false,
    this.horizontalSwipeEnabled = true,
    this.hapticsEnabled = true,
    this.trustPassportVisibility = 'public_minimal',
  });

  SettingsState copyWith({
    bool? leftHandedMode,
    bool? horizontalSwipeEnabled,
    bool? hapticsEnabled,
    String? trustPassportVisibility,
  }) {
    return SettingsState(
      leftHandedMode: leftHandedMode ?? this.leftHandedMode,
      horizontalSwipeEnabled:
          horizontalSwipeEnabled ?? this.horizontalSwipeEnabled,
      hapticsEnabled: hapticsEnabled ?? this.hapticsEnabled,
      trustPassportVisibility:
          trustPassportVisibility ?? this.trustPassportVisibility,
    );
  }
}
