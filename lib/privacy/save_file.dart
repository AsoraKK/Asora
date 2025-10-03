import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class SaveFileResult {
  final bool success;
  final String path;

  SaveFileResult(this.success, this.path);
}

/// Service interface for saving & sharing JSON content. Using a provider
/// allows widget tests to override the implementation and avoid platform
/// I/O during tests.
abstract class SaveFileService {
  Future<SaveFileResult> saveAndShareJson(
    String filename,
    String jsonContent, {
    bool share = true,
  });
}

class SaveFileServiceImpl implements SaveFileService {
  @override
  Future<SaveFileResult> saveAndShareJson(
    String filename,
    String jsonContent, {
    bool share = true,
  }) async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsString(jsonContent);

    if (share) {
      await Share.shareXFiles([XFile(file.path)], text: 'Asora data export');
    }

    return SaveFileResult(true, file.path);
  }
}

/// Provider so UIs can use the save/share service and tests can override it.
final saveFileProvider = Provider<SaveFileService>(
  (ref) => SaveFileServiceImpl(),
);

// Backwards-compatible top-level function kept for convenience; delegates
// to the provider's implementation when needed (deprecated for new code).
Future<SaveFileResult> saveAndShareJson(
  String filename,
  String jsonContent, {
  bool share = true,
}) async {
  final impl = SaveFileServiceImpl();
  return impl.saveAndShareJson(filename, jsonContent, share: share);
}
