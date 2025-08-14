// Shared test setup utilities
// Ensures Flutter binding is initialized for tests that rely on platform channels
import 'package:flutter_test/flutter_test.dart';

void initTestBindings() {
  TestWidgetsFlutterBinding.ensureInitialized();
}
