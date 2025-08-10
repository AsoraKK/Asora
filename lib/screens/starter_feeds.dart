import 'package:flutter/material.dart';

class StarterFeeds extends StatefulWidget {
  const StarterFeeds({super.key});
  @override
  State<StarterFeeds> createState() => _StarterFeedsState();
}

class _StarterFeedsState extends State<StarterFeeds>
    with TickerProviderStateMixin {
  late final TabController _tc = TabController(length: 3, vsync: this);

  @override
  void dispose() {
    _tc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Asora"),
        bottom: TabBar(
          controller: _tc,
          tabs: const [
            Tab(text: "Trending"),
            Tab(text: "New Creators"),
            Tab(text: "Local"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tc,
        children: const [
          FeedList(endpoint: "/api/feed/trending"),
          FeedList(endpoint: "/api/feed/new-creators"),
          FeedList(endpoint: "/api/feed/local"),
        ],
      ),
    );
  }
}

// Placeholder FeedList widget - replace with your actual implementation
class FeedList extends StatelessWidget {
  final String endpoint;
  const FeedList({super.key, required this.endpoint});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Feed: $endpoint'),
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          const Text('Loading posts...'),
        ],
      ),
    );
  }
}
