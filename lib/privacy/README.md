# Privacy (Export & Delete)

This folder contains the client-side helpers and UI for the privacy features (data export and account deletion).

Quick notes for developers

- Export file location:
  - The export JSON is written to the app's documents directory using `path_provider`.
  - On device/emulator:
    - Android: /data/data/<package>/files/<filename>
    - iOS (simulator): ~/Library/Developer/CoreSimulator/Devices/<device>/data/Containers/Data/Application/<app>/Documents/<filename>
    - On local desktop builds the documents directory varies by OS; `getApplicationDocumentsDirectory()` abstracts this.
- Filename pattern: `asora-data-export-YYYY-MM-DD.json`.

- Local development (calling Azure Functions):
  - The backend privacy endpoints require a valid bearer JWT and (in some dev setups) an Azure Function key.
  - Locally you can provide a function key via a Dart define:

    flutter run --dart-define=AZURE_FUNCTION_KEY=<your_function_key>

  - In the app the client uses the auth provider to obtain a JWT. For E2E tests or manual testing you can inject a valid test token into the auth provider mock.

- Testing & CI:
  - Widget tests override the `privacyRepositoryProvider` and `saveFileProvider` so no network or platform I/O is required.
  - If you add integration tests that call the real Functions, add a secure mechanism in CI to supply `AZURE_FUNCTION_KEY` and test tokens as secrets.

- Notes about deletion:
  - The delete endpoint requires a confirm header (`X-Confirm-Delete: true`) and is rate-limited on the server.
  - The UI asks for confirmation via a dialog before calling the deletion API.

If anything in this README becomes outdated, update it next to the code that depends on the contract (the screen, repository, or service).
