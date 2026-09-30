import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/post_model.dart';
import 'avatar_badge.dart';

class PostCard extends StatelessWidget {
  final Post post;
  final VoidCallback? onLikeTap;
  final VoidCallback? onCommentTap;
  final VoidCallback? onTap;

  const PostCard({
    super.key,
    required this.post,
    this.onLikeTap,
    this.onCommentTap,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        color: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  AvatarBadge(
                    name: post.authorName,
                    size: 38,
                    gradient: AppColors.avatarGradient2,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          post.authorName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.darkText,
                          ),
                        ),
                        Text(
                          '${post.tradeName} · 3h ago',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.lightText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.more_horiz, color: AppColors.midText),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                post.content,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.dark3,
                  height: 1.5,
                ),
              ),
            ),
            if (post.imageUrl != null) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                height: 220,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFE0F2FE), Color(0xFFEDE9FE)],
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.image_outlined,
                    size: 48,
                    color: AppColors.lightText.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ],
            const Divider(height: 1),
            Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: post.isLiked ? AppColors.accent : AppColors.midText,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: onLikeTap,
                    icon: Icon(
                      post.isLiked ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                    ),
                    label: Text(
                      '${post.likesCount}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.midText,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: onCommentTap ?? onTap,
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: Text(
                      '${post.commentsCount}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.midText,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                    onPressed: () {},
                    icon: const Icon(Icons.share_outlined, size: 18),
                    label: const Text(
                      'Share',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
