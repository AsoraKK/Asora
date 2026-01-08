import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/analytics/analytics_client.dart';
import '../core/analytics/analytics_events.dart';
import '../core/analytics/analytics_providers.dart';
import '../features/auth/application/auth_providers.dart';
import '../features/auth/domain/user.dart';
import '../features/feed/domain/models.dart' as domain;
import '../widgets/security_widgets.dart';
import '../widgets/reputation_badge.dart';
import '../features/privacy/privacy_settings_screen.dart';
import '../features/feed/presentation/create_post_screen.dart';
import '../features/moderation/presentation/moderation_console/moderation_console_screen.dart';

/// ---------------------------------------------------------------------------
///  Asora Feed – Perplexity‑inspired wireframe (dark‑mode default)
/// ---------------------------------------------------------------------------
///  • Soft geometric background pattern (diagonal grid)
///  • Center‑aligned header with leading profile icon & trailing share
///  • Rounded post "chips" – two full or one‑and‑two‑halves always visible
///  • Bottom search field à la Perplexity + 4‑icon nav bar
///  • Sora font everywhere
/// ---------------------------------------------------------------------------

class AsoraTheme {
  // Core palette
  static const _darkBg = Color(0xFF202124); // charcoal
  static const _lightBg = Color(0xFFF8F9FA); // light gray
  static const _accentBlue = Color(0xFF33B1FF); // neon sky blue
  static const _accentOrange = Color(0xFFFF7F45); // sunrise orange

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: _darkBg,
      // Use base textTheme instead of GoogleFonts during theme creation
      textTheme: base.textTheme,
      colorScheme: base.colorScheme.copyWith(
        primary: _accentBlue,
        secondary: _accentOrange,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: _darkBg,
        labelStyle: const TextStyle(color: Colors.white), // Use default style
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 2,
      ),
      cardTheme: CardThemeData(
        color: _darkBg.withValues(alpha: 0.94),
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
    );
  }

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: _lightBg,
      // Use base textTheme instead of GoogleFonts during theme creation
      textTheme: base.textTheme,
      colorScheme: base.colorScheme.copyWith(
        primary: _accentBlue,
        secondary: _accentOrange,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: _lightBg,
        labelStyle: const TextStyle(color: Colors.black87), // Use default style
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 2,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 3,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
    );
  }
}

// ---- AI‑score labels -------------------------------------------------------
enum HumanConfidence { high, medium, low, aiGen }

extension ConfidenceProps on HumanConfidence {
  String get label => switch (this) {
    HumanConfidence.high => 'High',
    HumanConfidence.medium => 'Medium',
    HumanConfidence.low => 'Low',
    HumanConfidence.aiGen => 'AI Gen',
  };
  Color get color => switch (this) {
    HumanConfidence.high => Colors.greenAccent,
    HumanConfidence.medium => Colors.amberAccent,
    HumanConfidence.low => Colors.deepOrangeAccent,
    HumanConfidence.aiGen => Colors.redAccent,
  };
}

// ---- Main screen -----------------------------------------------------------
class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Text(
          'Lythaus',
          style: GoogleFonts.sora(fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      drawer: _AsoraDrawer(authState: authState),
      floatingActionButton: const CreatePostFAB(),
      body: const Column(
        children: [
          DeviceSecurityBanner(),
          Expanded(child: Stack(children: [_BackgroundPattern(), _FeedList()])),
        ],
      ),
      bottomNavigationBar: const _AsoraNavBar(),
    );
  }
}

// ---- Background geometric pattern -----------------------------------------
class _BackgroundPattern extends StatelessWidget {
  const _BackgroundPattern();
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.infinite,
      painter: _GridPainter(color: Colors.white.withValues(alpha: 0.02)),
    );
  }
}

class _GridPainter extends CustomPainter {
  final Color color;
  const _GridPainter({required this.color});
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const step = 120.0; // spacing of diagonal lines
    // draw descending diagonals
    for (double x = -size.height; x < size.width; x += step) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x + size.height, size.height),
        paint,
      );
    }
    // draw ascending diagonals
    for (double x = 0; x < size.width + size.height; x += step) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x - size.height, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ---- Feed list -------------------------------------------------------------
class _FeedList extends ConsumerStatefulWidget {
  const _FeedList();
  @override
  ConsumerState<_FeedList> createState() => _FeedListState();
}

class _FeedListState extends ConsumerState<_FeedList> {
  final _scrollController = ScrollController();
  late List<domain.Post> _posts;
  late final AnalyticsClient _analyticsClient;
  final DateTime _sessionStart = DateTime.now();
  DateTime _lastScrollEvent = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _analyticsClient = ref.read(analyticsClientProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _analyticsClient.logEvent(
        AnalyticsEvents.screenView,
        properties: {
          AnalyticsEvents.propScreenName: 'feed',
          AnalyticsEvents.propReferrer: 'auth_gate',
        },
      );
    });
    // seed mock data
    _posts = List.generate(20, (i) {
      return domain.Post(
        id: 'p$i',
        authorId: 'u${i % 5}',
        authorUsername: 'user${i % 5}',
        text: 'A demo post body showcasing compact list cards. Item #$i',
        createdAt: DateTime.now().subtract(Duration(minutes: i * 7)),
        likeCount: (i * 3) % 50,
        dislikeCount: (i * 2) % 10,
      );
    });
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // mock pagination: append a few more items
      setState(() {
        final start = _posts.length;
        _posts.addAll(
          List.generate(10, (j) {
            final i = start + j;
            return domain.Post(
              id: 'p$i',
              authorId: 'u${i % 5}',
              authorUsername: 'user${i % 5}',
              text: 'Lazy‑loaded post #$i',
              createdAt: DateTime.now().subtract(Duration(minutes: i * 7)),
              likeCount: (i * 3) % 50,
              dislikeCount: (i * 2) % 10,
            );
          }),
        );
      });
    }

    final now = DateTime.now();
    if (now.difference(_lastScrollEvent) > const Duration(seconds: 8)) {
      _analyticsClient.logEvent(
        AnalyticsEvents.feedScrolled,
        properties: {
          AnalyticsEvents.propApproxItemsViewed:
              (_scrollController.position.pixels / 200).ceil(),
          AnalyticsEvents.propSessionDurationSeconds: now
              .difference(_sessionStart)
              .inSeconds,
        },
      );
      _lastScrollEvent = now;
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isGuest = ref.watch(authStateProvider).value == null;
    return Padding(
      padding: const EdgeInsets.only(top: kToolbarHeight + 12, bottom: 130),
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.only(right: 12),
        itemCount: _posts.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final p = _posts[index];
          final confidence =
              HumanConfidence.values[index % HumanConfidence.values.length];
          return Align(
            alignment: Alignment.topLeft,
            child: _PostCard(
              username: 'User${p.authorId}',
              text: p.text,
              confidence: confidence,
              isGuest: isGuest,
            ),
          );
        },
      ),
    );
  }
}

// ---- Post card -------------------------------------------------------------
class _PostCard extends StatelessWidget {
  final String username;
  final String text;
  final HumanConfidence confidence;
  final bool isGuest;
  const _PostCard({
    required this.username,
    required this.text,
    required this.confidence,
    required this.isGuest,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Align(
      alignment: Alignment.topLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: theme.colorScheme.primary,
                      child: Text(
                        username[0].toUpperCase(),
                        style: GoogleFonts.sora(fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      username,
                      style: GoogleFonts.sora(
                        fontWeight: FontWeight.w500,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _ConfidenceChip(confidence: confidence),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  text,
                  style: GoogleFonts.sora(
                    fontSize: 14,
                    height: 1.4,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 12),
                IconTheme(
                  data: const IconThemeData(size: 20, color: Colors.white60),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.thumb_up_alt_outlined),
                        onPressed: isGuest
                            ? () => _promptSignIn(context)
                            : () {},
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.thumb_down_alt_outlined),
                        onPressed: isGuest
                            ? () => _promptSignIn(context)
                            : () {},
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.chat_bubble_outline),
                        onPressed: isGuest
                            ? () => _promptSignIn(context)
                            : () {},
                      ),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.flag_outlined),
                        onPressed: isGuest
                            ? () => _promptSignIn(context)
                            : () {},
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

void _promptSignIn(BuildContext context) {
  ScaffoldMessenger.of(context).hideCurrentSnackBar();
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Sign in to like, comment, or report.'),
      duration: Duration(seconds: 2),
    ),
  );
}

class _ConfidenceChip extends StatelessWidget {
  final HumanConfidence confidence;
  const _ConfidenceChip({required this.confidence});

  @override
  Widget build(BuildContext context) {
    return Chip(
      labelPadding: const EdgeInsets.symmetric(horizontal: 10),
      shape: const StadiumBorder(),
      label: Text(
        confidence.label,
        style: GoogleFonts.sora(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: confidence.color,
        ),
      ),
      backgroundColor: confidence.color.withValues(alpha: 0.18),
      side: BorderSide(color: confidence.color, width: 1),
      visualDensity: VisualDensity.compact,
    );
  }
}

// ---- Bottom nav ------------------------------------------------------------
class _AsoraNavBar extends StatelessWidget {
  const _AsoraNavBar();
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return NavigationBar(
      height: 80,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.search), label: ''),
        NavigationDestination(icon: Icon(Icons.route_outlined), label: ''),
        NavigationDestination(
          icon: Icon(Icons.auto_awesome_outlined),
          label: '',
        ),
        NavigationDestination(icon: Icon(Icons.sensors_outlined), label: ''),
      ],
      backgroundColor: isDark ? Colors.black : Colors.white,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
    );
  }
}

// ---- Navigation Drawer ----------------------------------------------------
class _AsoraDrawer extends ConsumerWidget {
  final AsyncValue<User?> authState;

  const _AsoraDrawer({required this.authState});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isSignedIn = authState.value != null;
    final user = authState.value;
    final isModerator =
        user?.role == UserRole.moderator || user?.role == UserRole.admin;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: theme.colorScheme.primary,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  theme.colorScheme.primary,
                  theme.colorScheme.secondary,
                ],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: Icon(
                    isSignedIn ? Icons.person : Icons.person_outline,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  isSignedIn ? 'Welcome back!' : 'Welcome to Asora',
                  style: GoogleFonts.sora(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (isSignedIn && user != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      ReputationBadge(
                        score: user.reputationScore,
                        size: ReputationBadgeSize.medium,
                        showLabel: true,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Navigation items
          if (isSignedIn) ...[
            if (isModerator)
              ListTile(
                leading: const Icon(Icons.rule_folder_outlined),
                title: Text('Moderation Queue', style: GoogleFonts.sora()),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const ModerationConsoleScreen(),
                    ),
                  );
                },
              ),
            ListTile(
              leading: const Icon(Icons.person),
              title: Text('Profile', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Profile');
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: Text('Notifications', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Notifications');
              },
            ),
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: Text('Privacy Settings', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const PrivacySettingsScreen(),
                  ),
                );
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: Text('Settings', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Settings');
              },
            ),
            ListTile(
              leading: const Icon(Icons.help_outline),
              title: Text('Help & Support', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Help & Support');
              },
            ),
            const Divider(),
            ListTile(
              leading: Icon(Icons.logout, color: theme.colorScheme.error),
              title: Text(
                'Sign Out',
                style: GoogleFonts.sora(color: theme.colorScheme.error),
              ),
              onTap: () => _handleSignOut(context, ref),
            ),
          ] else ...[
            ListTile(
              leading: const Icon(Icons.login),
              title: Text('Sign In', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Sign In');
              },
            ),
            ListTile(
              leading: const Icon(Icons.person_add),
              title: Text('Sign Up', style: GoogleFonts.sora()),
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context, 'Sign Up');
              },
            ),
          ],

          const Divider(),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: Text('About Asora', style: GoogleFonts.sora()),
            onTap: () {
              Navigator.pop(context);
              _showAboutDialog(context);
            },
          ),
        ],
      ),
    );
  }

  void _showComingSoon(BuildContext context, String featureName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$featureName is coming soon.'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleSignOut(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Sign Out', style: GoogleFonts.sora()),
        content: Text(
          'Are you sure you want to sign out?',
          style: GoogleFonts.sora(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancel', style: GoogleFonts.sora()),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop(); // Close dialog
              Navigator.of(context).pop(); // Close drawer
              // Sign out using the auth state notifier
              ref.read(authStateProvider.notifier).signOut();
            },
            child: Text('Sign Out', style: GoogleFonts.sora()),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: 'Lythaus',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(
            colors: [
              Theme.of(context).colorScheme.primary,
              Theme.of(context).colorScheme.secondary,
            ],
          ),
        ),
        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
      ),
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Text(
            'A social platform for authentic human-authored content with AI-powered verification.',
            style: GoogleFonts.sora(fontSize: 14),
          ),
        ),
      ],
    );
  }
}
