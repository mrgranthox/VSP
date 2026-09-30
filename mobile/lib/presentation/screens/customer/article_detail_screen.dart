import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/avatar_badge.dart';

class ArticleDetailScreen extends StatefulWidget {
  final String slug;

  const ArticleDetailScreen({super.key, required this.slug});

  @override
  State<ArticleDetailScreen> createState() => _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends State<ArticleDetailScreen> {
  final TextEditingController _commentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LinkedInProvider>().selectArticle(widget.slug);
    });
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final article = provider.currentArticle;

    if (article == null && provider.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (article == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Article Not Found')),
        body: const Center(child: Text('This article is no longer available.')),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Trades Article', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Article link copied to clipboard!')),
              );
            },
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _commentCtrl,
                  decoration: InputDecoration(
                    hintText: 'Add your perspective...',
                    hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                    filled: true,
                    fillColor: const Color(0xFFF3F4F6),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send_rounded, color: AppColors.brand),
                onPressed: () {
                  final text = _commentCtrl.text.trim();
                  if (text.isNotEmpty) {
                    provider.addArticleComment(article.id, text);
                    _commentCtrl.clear();
                    FocusScope.of(context).unfocus();
                  }
                },
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        children: [
          if (article.coverImageUrl != null)
            Image.network(
              article.coverImageUrl!,
              height: 220,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Author row
                Row(
                  children: [
                    AvatarBadge(
                      name: article.authorName,
                      imageUrl: article.authorAvatarUrl,
                      radius: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            article.authorName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.darkText),
                          ),
                          if (article.authorHeadline != null)
                            Text(
                              article.authorHeadline!,
                              style: const TextStyle(fontSize: 12, color: AppColors.midText),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            'Published • ${article.readingTimeMinutes} min read',
                            style: const TextStyle(fontSize: 11, color: AppColors.lightText),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Title & Subtitle
                Text(
                  article.title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.darkText,
                    height: 1.3,
                  ),
                ),
                if (article.subtitle != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    article.subtitle!,
                    style: const TextStyle(
                      fontSize: 15,
                      fontStyle: FontStyle.italic,
                      color: AppColors.midText,
                      height: 1.4,
                    ),
                  ),
                ],
                const Divider(height: 32),

                // Article Content
                Text(
                  article.content,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.7,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const Divider(height: 40),

                // Reactions row
                Row(
                  children: [
                    InkWell(
                      onTap: () => provider.toggleArticleReaction(article.id),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: article.isReacted ? AppColors.brandLight : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              article.isReacted ? Icons.thumb_up : Icons.thumb_up_outlined,
                              size: 18,
                              color: article.isReacted ? AppColors.brandDark : AppColors.midText,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${article.reactionsCount} Likes',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: article.isReacted ? AppColors.brandDark : AppColors.darkText,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${article.commentsCount} Comments',
                      style: const TextStyle(fontSize: 13, color: AppColors.midText, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Comments header
                const Text(
                  'Community Discussion',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                const SizedBox(height: 12),

                if (provider.articleComments.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      'Be the first skilled tradesperson to leave a comment!',
                      style: TextStyle(fontSize: 13, color: AppColors.midText),
                    ),
                  )
                else
                  ...provider.articleComments.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              AvatarBadge(
                                name: c.authorName,
                                imageUrl: c.authorAvatarUrl,
                                radius: 14,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                c.authorName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            c.content,
                            style: const TextStyle(fontSize: 13, color: AppColors.darkText),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
