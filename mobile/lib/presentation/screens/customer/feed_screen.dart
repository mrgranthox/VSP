import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/feed_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/hashtag_chip.dart';
import '../../widgets/linkedin_post_creator.dart';
import '../../widgets/post_card.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  final List<String> _tradeTags = [
    'All',
    'SolarInstallation',
    'GhanaTrades',
    'ElectricalEngineering',
    'PlumbingTips',
    'HVAC',
    'SafetyFirst',
  ];

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final activeTag = feed.selectedHashtagFilter ?? 'All';

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Trade Community Feed',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: AppColors.darkText),
            tooltip: 'Search Posts',
            onPressed: () => context.push('/customer/search'),
          ),
          IconButton(
            icon: const Icon(Icons.edit_note_rounded, color: AppColors.brand, size: 28),
            tooltip: 'Share Project',
            onPressed: () => LinkedInPostCreatorSheet.show(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => feed.loadFeed(),
        color: AppColors.brand,
        child: Column(
          children: [
            // Top Quick Share Card
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  const AvatarBadge(name: 'You', radius: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () => LinkedInPostCreatorSheet.show(context),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.screenBg,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Text(
                          'Share a completed project, tip, or ask...',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.midText,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.photo_camera_outlined, color: AppColors.brand),
                    onPressed: () => LinkedInPostCreatorSheet.show(context),
                  ),
                ],
              ),
            ),

            // Hashtag Filter Pills
            Container(
              height: 44,
              color: Colors.white,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                itemCount: _tradeTags.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final tag = _tradeTags[index];
                  final isSelected = tag == activeTag ||
                      (tag == 'All' && (feed.selectedHashtagFilter == null || feed.selectedHashtagFilter == 'All'));

                  return HashtagChip(
                    tag: tag == 'All' ? 'All Updates' : tag,
                    isSelected: isSelected,
                    onTap: () {
                      feed.filterByHashtag(tag == 'All' ? null : tag);
                    },
                  );
                },
              ),
            ),
            const Divider(height: 1),

            // Feed List
            Expanded(
              child: feed.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : feed.filteredPosts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.feed_outlined, size: 48, color: AppColors.lightText),
                              const SizedBox(height: 12),
                              Text(
                                'No updates in #${feed.selectedHashtagFilter ?? "community"} yet',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  color: AppColors.darkText,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Be the first craftsman to share a project in this topic!',
                                style: TextStyle(color: AppColors.midText, fontSize: 13),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.brand,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppTheme.radius),
                                  ),
                                ),
                                onPressed: () => LinkedInPostCreatorSheet.show(context),
                                child: const Text('Share Project'),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          itemCount: feed.filteredPosts.length,
                          itemBuilder: (context, index) {
                            final post = feed.filteredPosts[index];
                            return PostCard(
                              post: post,
                              onLike: () => feed.toggleLike(post.id),
                              onComment: () => context.push('/customer/feed/${post.id}'),
                              onTap: () => context.push('/customer/feed/${post.id}'),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
