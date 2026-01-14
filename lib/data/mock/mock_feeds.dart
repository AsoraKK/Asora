// ignore_for_file: public_member_api_docs

import 'package:asora/state/models/feed_models.dart';

const List<FeedModel> mockFeeds = [
  FeedModel(
    id: 'discover',
    name: 'Discover',
    type: FeedType.discover,
    contentFilters: ContentFilters(
      allowedTypes: {ContentType.mixed, ContentType.text, ContentType.image},
    ),
    sorting: SortingRule.relevant,
    refinements: FeedRefinements(
      includeKeywords: ['human-first', 'verified'],
      excludeKeywords: ['spam'],
    ),
    subscriptionLevelRequired: 0,
    isHome: false,
  ),
  FeedModel(
    id: 'news',
    name: 'News',
    type: FeedType.news,
    contentFilters: ContentFilters(
      allowedTypes: {ContentType.text, ContentType.image},
    ),
    sorting: SortingRule.hot,
    refinements: FeedRefinements(
      includeKeywords: ['breaking', 'analysis'],
      excludeKeywords: ['opinion'],
    ),
    subscriptionLevelRequired: 0,
  ),
  FeedModel(
    id: 'custom-free',
    name: 'Custom Free',
    type: FeedType.custom,
    contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
    sorting: SortingRule.following,
    refinements: FeedRefinements(
      includeAccounts: ['@investigative_anna', '@climate_watch'],
      excludeKeywords: ['giveaway'],
    ),
    subscriptionLevelRequired: 0,
    isCustom: true,
    isHome: true,
  ),
  FeedModel(
    id: 'custom-premium-1',
    name: 'Premium Tech',
    type: FeedType.custom,
    contentFilters: ContentFilters(
      allowedTypes: {ContentType.text, ContentType.image},
    ),
    sorting: SortingRule.newest,
    refinements: FeedRefinements(
      includeKeywords: ['ai', 'governance', 'safety'],
      excludeKeywords: ['rumor'],
    ),
    subscriptionLevelRequired: 1,
    isCustom: true,
  ),
  FeedModel(
    id: 'custom-premium-2',
    name: 'Policy Desk',
    type: FeedType.custom,
    contentFilters: ContentFilters(
      allowedTypes: {ContentType.text, ContentType.video},
    ),
    sorting: SortingRule.relevant,
    refinements: FeedRefinements(
      includeKeywords: ['policy', 'election', 'integrity'],
      excludeKeywords: ['clickbait'],
    ),
    subscriptionLevelRequired: 1,
    isCustom: true,
  ),
  FeedModel(
    id: 'custom-black-1',
    name: 'Black Tier: Geo',
    type: FeedType.custom,
    contentFilters: ContentFilters(allowedTypes: {ContentType.mixed}),
    sorting: SortingRule.hot,
    refinements: FeedRefinements(
      includeKeywords: ['geopolitics', 'intel'],
      includeAccounts: ['@field_report', '@ocean_guard'],
    ),
    subscriptionLevelRequired: 2,
    isCustom: true,
  ),
];

final List<FeedItem> mockFeedItems = [
  FeedItem(
    id: 'f1',
    feedId: 'discover',
    author: 'Lena • Local Desk',
    contentType: ContentType.text,
    title: 'Morning brief: three stories to know',
    body:
        'EV policy vote delayed, river levels stable, and a new audit on data '
        'disclosures just landed.',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 12)),
    tags: const ['brief', 'civic'],
  ),
  FeedItem(
    id: 'f2',
    feedId: 'discover',
    author: 'Dayo • Field',
    contentType: ContentType.image,
    title: 'Wildfire crew rotation',
    body: 'Images from the southern ridge after the containment line held.',
    imageUrl:
        'https://images.unsplash.com/photo-1509610696553-9243c1e2302a?auto=format&fit=crop&w=900&q=60',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 30)),
    tags: const ['climate', 'field'],
  ),
  FeedItem(
    id: 'f3',
    feedId: 'news',
    author: 'Lythaus Newsdesk',
    contentType: ContentType.text,
    title: 'Hybrid model explainer',
    body: 'Verified journalists pair with high-rep locals for layered context.',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 8)),
    isNews: true,
    tags: const ['news', 'explainer'],
    isPinned: true,
  ),
  FeedItem(
    id: 'f4',
    feedId: 'news',
    author: 'Reuters (synd.)',
    contentType: ContentType.image,
    title: 'Infrastructure bill edges forward',
    body:
        'Close vote expected this afternoon with amendments on privacy carveouts.',
    imageUrl:
        'https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=900&q=60',
    publishedAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 10)),
    isNews: true,
    tags: const ['policy', 'economy'],
  ),
  FeedItem(
    id: 'f5',
    feedId: 'custom-free',
    author: 'Investigative Anna',
    contentType: ContentType.text,
    title: 'Court filing shows revised data policy',
    body: 'New constraints on third-party handoffs with clearer auditability.',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 3)),
    tags: const ['governance'],
  ),
  FeedItem(
    id: 'f6',
    feedId: 'custom-premium-1',
    author: 'Labs Weekly',
    contentType: ContentType.video,
    title: 'Model access audit trail',
    body: 'Walkthrough of how we review prompts flagged by community.',
    videoThumbnailUrl:
        'https://images.unsplash.com/photo-1451188502541-13943edb6acb?auto=format&fit=crop&w=900&q=60',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 22)),
    tags: const ['ai', 'safety'],
  ),
  FeedItem(
    id: 'f7',
    feedId: 'custom-premium-2',
    author: 'Policy Desk',
    contentType: ContentType.text,
    title: 'New transparency metric for feeds',
    body: 'We are piloting reviewer notes on every elevated story.',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 17)),
    tags: const ['policy'],
  ),
  FeedItem(
    id: 'f8',
    feedId: 'custom-black-1',
    author: 'Ocean Guard',
    contentType: ContentType.image,
    title: 'Strait traffic map',
    body: 'Sat imagery annotated with current traffic anomalies.',
    imageUrl:
        'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=900&q=60',
    publishedAt: DateTime.now().subtract(const Duration(minutes: 44)),
    tags: const ['geo', 'analysis'],
  ),
];

List<FeedItem> feedItemsFor(String feedId) {
  final items = mockFeedItems.where((item) => item.feedId == feedId).toList()
    ..sort((a, b) => b.publishedAt.compareTo(a.publishedAt));
  return items;
}
