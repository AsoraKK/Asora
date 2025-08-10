# Asora Feed Screen Implementation

## ✅ Completed Tasks

### 1️⃣ Dependencies
- ✅ Added `google_fonts: ^6.0.0` to pubspec.yaml
- ✅ Ran `flutter pub get`

### 2️⃣ Global Theming (Sora everywhere)
- ✅ Implemented `AsoraTheme.dark()` & `AsoraTheme.light()`
  - **Dark theme**: charcoal #202124 background, neon-sky #33B1FF primary, sunrise-orange #FF7F45 secondary
  - **Light theme**: light gray #F8F9FA background with same accent colors
  - ✅ Card radius 28, Chip radius 20, rounded corners overall
  - ✅ Sora font applied everywhere via Google Fonts

### 3️⃣ Main wrapper
- ✅ Updated `main.dart` with:
  - `theme: AsoraTheme.light()`
  - `darkTheme: AsoraTheme.dark()`
  - `themeMode: ThemeMode.dark` (set to dark mode by default)
  - `home: const FeedScreen()`

### 4️⃣ FeedScreen layout
- ✅ Transparent AppBar with profile icon → "Asora" title → share icon
- ✅ `extendBodyBehindAppBar: true`
- ✅ Custom diagonal grid background at 2% opacity
- ✅ `PageView.builder` with `viewportFraction: 0.82` → shows ~2 full cards or 1 + 2 halves
- ✅ Each card includes:
  - CircleAvatar with user initial
  - Username
  - AI-confidence Chip (High/Medium/Low/AI Gen)
  - Post body text
  - Action row (👍 👎 💬 🚩)
- ✅ Confidence chip colors:
  - **High**: green-accent
  - **Medium**: amber-accent  
  - **Low**: deep-orange-accent
  - **AI Gen**: red-accent
  - Background colors at 18% opacity

### 5️⃣ Search & Navigation
- ✅ Floating search bar overlay (rounded 28, mic icon) - Perplexity style
- ✅ Minimal 4-icon NavigationBar fixed to bottom, height = 80, no label text
- ✅ Adaptive colors for dark/light themes

### 6️⃣ Next Iterations (TODO Comments)
- 🔄 Replace demo list with Riverpod provider once `/feed` API is live
- 🔄 Fine-tune spacing & chip height to client spec
- 🔄 Add profile, post-detail, create-post screens

## 🎨 Features Implemented

### Visual Design
- **Background**: Subtle diagonal grid pattern at 2% opacity
- **Typography**: Sora font family throughout
- **Cards**: Rounded corners (28px radius), elevation shadows
- **Colors**: Dark charcoal with neon blue/orange accents
- **Layout**: Page-view with viewport fraction for partial card previews

### Interactive Elements
- **Action Buttons**: Like, dislike, comment, flag icons
- **Search Overlay**: Perplexity-style floating search with mic input
- **Navigation**: Clean 4-icon bottom navigation
- **Confidence Chips**: Color-coded AI detection indicators

### Demo Data
- 20 sample posts with rotating confidence levels
- Dynamic user avatars with initials
- Responsive text content

## 🚀 Running the App

```bash
flutter clean
flutter pub get
flutter run -d windows  # or your preferred device
```

To toggle between light/dark mode, change `themeMode` in `main.dart`:
- `ThemeMode.dark` for dark mode
- `ThemeMode.light` for light mode
- `ThemeMode.system` for system preference

## 📂 File Structure

```
lib/
├── main.dart                 # App entry point with themes
└── screens/
    └── feed_screen.dart      # Main feed implementation
```

## 🔧 Hot Reload Ready

The implementation supports Flutter hot reload for quick iteration on:
- Spacing adjustments
- Color tweaks  
- Behavior modifications
- Content updates

Ready for client feedback and refinements!
