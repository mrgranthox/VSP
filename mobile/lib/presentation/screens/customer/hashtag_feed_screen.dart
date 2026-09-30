import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/feed_provider.dart';
import '../../widgets/post_card.dart';

class HashtagFeedScreen extends StatefulWidget {
  final String tag;

  const HashtagFeedScreen({
    super.key,
    required this.tag,
  });

  @override
  State<HashtagFeedScreen> createState() => _HashtagFeedScreenState();
}

class _HashtagFeedScreenState extends State<HashtagFeedScreen> {
  bool _isFollowing = false;
  int _followersCount = 428;

  String get _cleanTag => widget.tag.replaceAll('#', '');

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();
    final taggedPosts = feed.posts.where((p) {
      return p.hashtags.any((t) => t.toLowerCase() == _cleanTag.toLowerCase()) ||
          p.content.toLowerCase().contains('#${_cleanTag.toLowerCase()}');
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text('#$_cleanTag', style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.edit_note_rounded),
        label: Text('Post to #$_cleanTag'),
        onPressed: () => context.push('/customer/post/create'),
      ),
      body: Column(
        children: [
          // Header Card
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: AppColors.brandLight,
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                  ),
                  child: const Center(
                    child: Text(
                      '#',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: AppColors.brandDark,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#$_cleanTag',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.darkText,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$_followersCount professionals follow this trade topic',
                        style: const TextStyle(fontSize: 12, color: AppColors.midText),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isFollowing ? Colors.white : AppColors.brand,
                    foregroundColor: _isFollowing ? AppColors.brandDark : Colors.white,
                    side: _isFollowing
                        ? const BorderSide(color: AppColors.brand, width: 1.2)
                        : BorderSide.none,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                  ),
                  onPressed: () {
                    setState(() {
                      _isFollowing = !_isFollowing;
                      _followersCount += _isFollowing ? 1 : -1;
                    });
                  },
                  child: Text(_isFollowing ? 'Following' : '+ Follow'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Posts List
          Expanded(
            child: taggedPosts.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.tag_rounded, size: 54, color: AppColors.lightText),
                          const SizedBox(height: 12),
                          Text(
                            'No posts tagged #$_cleanTag yet',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.darkText,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Share your work, equipment, or questions to start this discussion!',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppColors.midText),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    itemCount: taggedPosts.length,
                    itemBuilder: (context, index) {
                      return PostCard(post: taggedPosts[index]);
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
