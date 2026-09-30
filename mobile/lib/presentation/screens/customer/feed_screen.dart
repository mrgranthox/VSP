import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/feed_provider.dart';
import '../../widgets/post_card.dart';

class FeedScreen extends StatelessWidget {
  const FeedScreen({super.key});

  void _showCreatePostDialog(BuildContext context) {
    final textController = TextEditingController();
    final feed = context.read<FeedProvider>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXl)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Share Project / Update',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: textController,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'Describe completed work, tips, or ask a question...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                    ),
                  ),
                  onPressed: () async {
                    if (textController.text.trim().isNotEmpty) {
                      await feed.createPost(textController.text.trim());
                      if (context.mounted) Navigator.pop(ctx);
                    }
                  },
                  child: const Text('Publish Post',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Community Feed'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note_rounded, color: AppColors.brand, size: 28),
            tooltip: 'Share Project',
            onPressed: () => _showCreatePostDialog(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => feed.loadFeed(),
        color: AppColors.brand,
        child: feed.isLoading
            ? const Center(child: CircularProgressIndicator())
            : ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: feed.posts.length,
                itemBuilder: (context, index) {
                  final post = feed.posts[index];
                  return PostCard(
                    post: post,
                    onLikeTap: () => feed.toggleLike(post.id),
                    onCommentTap: () => context.push('/post/${post.id}'),
                    onTap: () => context.push('/post/${post.id}'),
                  );
                },
              ),
      ),
    );
  }
}
