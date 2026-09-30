import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/avatar_badge.dart';

class ArticlesFeedScreen extends StatefulWidget {
  const ArticlesFeedScreen({super.key});

  @override
  State<ArticlesFeedScreen> createState() => _ArticlesFeedScreenState();
}

class _ArticlesFeedScreenState extends State<ArticlesFeedScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final articles = provider.articles.where((a) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return a.title.toLowerCase().contains(q) ||
          a.authorName.toLowerCase().contains(q) ||
          (a.subtitle?.toLowerCase().contains(q) ?? false);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text(
          'Vocational Articles & Insights',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note_rounded, color: AppColors.brand, size: 28),
            tooltip: 'Write an Article',
            onPressed: () => context.push('/articles/create'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.edit_outlined),
        label: const Text('Write Article', style: TextStyle(fontWeight: FontWeight.w600)),
        onPressed: () => context.push('/articles/create'),
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadArticles(),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Search field
            TextField(
              decoration: InputDecoration(
                hintText: 'Search industry insights, electrical, plumbing...',
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                prefixIcon: const Icon(Icons.search, color: AppColors.midText, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
            const SizedBox(height: 14),

            // Articles count header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Top Trades Articles (${articles.length})',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                const Text(
                  'Peer Reviewed',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.brand),
                ),
              ],
            ),
            const SizedBox(height: 10),

            if (articles.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                child: const Column(
                  children: [
                    Icon(Icons.article_outlined, size: 48, color: AppColors.midText),
                    SizedBox(height: 12),
                    Text('No articles found matching your search.', style: TextStyle(color: AppColors.midText)),
                  ],
                ),
              )
            else
              ...articles.map((art) => _buildArticleCard(context, provider, art)),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildArticleCard(BuildContext context, LinkedInProvider provider, dynamic art) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          provider.selectArticle(art.slug);
          context.push('/articles/${art.slug}');
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (art.coverImageUrl != null)
              Image.network(
                art.coverImageUrl!,
                height: 150,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  height: 100,
                  color: AppColors.brandLight,
                  child: const Center(child: Icon(Icons.image_not_supported, color: AppColors.brand)),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Author row
                  Row(
                    children: [
                      AvatarBadge(
                        name: art.authorName,
                        imageUrl: art.authorAvatarUrl,
                        radius: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              art.authorName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.darkText),
                            ),
                            if (art.authorHeadline != null)
                              Text(
                                art.authorHeadline!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, color: AppColors.midText),
                              ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.brandLight,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${art.readingTimeMinutes} min read',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.brandDark),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Title
                  Text(
                    art.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkText,
                      height: 1.3,
                    ),
                  ),
                  if (art.subtitle != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      art.subtitle!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, color: AppColors.midText, height: 1.3),
                    ),
                  ],
                  const SizedBox(height: 12),

                  // Metrics & Actions
                  Row(
                    children: [
                      Text(
                        '👀 ${art.viewCount} views',
                        style: const TextStyle(fontSize: 11, color: AppColors.midText),
                      ),
                      const Spacer(),
                      InkWell(
                        onTap: () => provider.toggleArticleReaction(art.id),
                        child: Row(
                          children: [
                            Icon(
                              art.isReacted ? Icons.thumb_up : Icons.thumb_up_outlined,
                              size: 16,
                              color: art.isReacted ? AppColors.brand : AppColors.midText,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${art.reactionsCount}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: art.isReacted ? AppColors.brand : AppColors.midText,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Row(
                        children: [
                          const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: AppColors.midText),
                          const SizedBox(width: 4),
                          Text(
                            '${art.commentsCount}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.midText),
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
