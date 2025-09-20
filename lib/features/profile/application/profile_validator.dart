// Lightweight client-side pre-check for profile text
class ProfileValidator {
  static final _badWords = RegExp(
    r"\b(fuck|shit|bitch|asshole|bastard)\b",
    caseSensitive: false,
  );

  static String? validateDisplayName(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return 'Display name is required';
    if (_badWords.hasMatch(v)) return 'Please choose a different display name';
    return null;
  }

  static String? validateBio(String? value) {
    final v = (value ?? '').trim();
    if (v.isEmpty) return null;
    if (_badWords.hasMatch(v)) return 'Please remove profane language';
    return null;
  }
}
