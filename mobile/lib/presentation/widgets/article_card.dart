import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'avatar_badge.dart';

class ArticleCard extends StatelessWidget {
  final String id;
  final String title;
  final String slug;
  final String? subtitle;
  final String? coverImageUrl;
  final String authorName;
  final String? authorHeadline;
  final String? authorAvatarUrl;
  final int readingTimeMinutes;
  final int reactionsCount;
  final int commentsCount;
  final VoidCallback? onTap;

  const ArticleCard({
    super.key,
    required this.id,
    required this.title,
    required this.slug,
    this.subtitle,
    this.coverImageUrl,
    required this.authorName,
    this.authorHeadline,
    this.authorAvatarUrl,
    this.readingTimeMinutes = 4,
    this.reactionsCount = 0,
    this.commentsCount = 0,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap ?? () => context.push('/articles/$slug'),
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (coverImageUrl != null && coverImageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radius)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    coverImageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppColors.screenBg,
                      child: const Center(
                        child: Icon(Icons.article_outlined, size: 40, color: AppColors.brand),
                      ),
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.brandLight,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'TECHNICAL GUIDE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppColors.brandDark,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '$readingTimeMinutes min read',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.midText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.darkText,
                      height: 1.25,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.midText,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      AvatarBadge(
                        name: authorName,
                        imageUrl: authorAvatarUrl,
                        radius: 14,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          authorName,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.darkText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.thumb_up_outlined, size: 14, color: AppColors.midText),
                          const SizedBox(width: 3),
                          Text(
                            '$reactionsCount',
                            style: const TextStyle(fontSize: 11, color: AppColors.midText),
                          ),
                          const SizedBox(width: 10),
                          const Icon(Icons.chat_bubble_outline, size: 14, color: AppColors.midText),
                          const SizedBox(width: 3),
                          Text(
                            '$commentsCount',
                            style: const TextStyle(fontSize: 11, color: AppColors.midText),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
