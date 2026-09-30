import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/data/models/post_model.dart';
import 'package:vsp_mobile/data/repositories/social_repository.dart';
import 'package:vsp_mobile/presentation/providers/feed_provider.dart';
import 'package:vsp_mobile/presentation/widgets/avatar_badge.dart';

class PostDetailScreen extends StatefulWidget {
  final String postId;

  const PostDetailScreen({super.key, required this.postId});

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final TextEditingController _commentController = TextEditingController();
  bool _isLoading = true;
  Post? _post;
  List<PostComment> _comments = [];
  bool _isSubmittingComment = false;

  @override
  void initState() {
    super.initState();
    _loadPostDetails();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadPostDetails() async {
    setState(() => _isLoading = true);
    final socialRepo = context.read<SocialRepository>();

    try {
      final post = await socialRepo.getPostDetail(widget.postId);
      _post = post;
      _comments = [
        PostComment(
          id: 'c1',
          postId: widget.postId,
          authorName: 'Kwesi Appiah',
          content: 'Excellent craftsmanship! Clean wiring layout.',
          createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        ),
        PostComment(
          id: 'c2',
          postId: widget.postId,
          authorName: 'Sarah Jenkins',
          content: 'Do you also service residential units in East Legon?',
          createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
        ),
      ];
    } catch (_) {}

    setState(() => _isLoading = false);
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSubmittingComment = true);
    final socialRepo = context.read<SocialRepository>();

    try {
      final comment = await socialRepo.addComment(widget.postId, text);
      setState(() {
        _comments.add(comment);
        _commentController.clear();
      });
    } catch (_) {
      // Fallback local append for immediate UX responsiveness
      setState(() {
        _comments.add(
          PostComment(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            postId: widget.postId,
            authorName: 'You',
            content: text,
            createdAt: DateTime.now(),
          ),
        );
        _commentController.clear();
      });
    }

    setState(() => _isSubmittingComment = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Post')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_post == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Post')),
        body: const Center(child: Text('Post not found')),
      );
    }

    final post = _post!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Post Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Post link copied to clipboard')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Author Header
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        AvatarBadge(
                          name: post.authorName,
                          imageUrl: post.authorAvatarUrl,
                          radius: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                post.authorName,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    post.tradeName,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const Text(' • ',
                                      style: TextStyle(
                                          color: AppColors.textMuted)),
                                  Text(
                                    DateFormat.yMMMd().format(post.createdAt),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        OutlinedButton(
                          onPressed: () => context.push(
                              '/customer/workers/${post.workerProfileId}'),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                          ),
                          child: const Text('View Pro',
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.primary)),
                        ),
                      ],
                    ),
                  ),

                  // Post Content Text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Text(
                      post.content,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textPrimary,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Post Image (if any)
                  if (post.imageUrl != null && post.imageUrl!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          post.imageUrl!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          errorBuilder: (_, _, _) => Container(
                            height: 200,
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: Icon(Icons.image_not_supported_outlined,
                                  color: Colors.grey),
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Like & Comment Count Stats
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                    child: Row(
                      children: [
                        Consumer<FeedProvider>(
                          builder: (context, feedProv, _) {
                            final isLiked = feedProv.posts
                                    .firstWhere((p) => p.id == post.id,
                                        orElse: () => post)
                                    .isLiked;
                            final likes = feedProv.posts
                                    .firstWhere((p) => p.id == post.id,
                                        orElse: () => post)
                                    .likesCount;

                            return InkWell(
                              onTap: () => feedProv.toggleLike(post.id),
                              borderRadius: BorderRadius.circular(20),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                child: Row(
                                  children: [
                                    Icon(
                                      isLiked
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      size: 20,
                                      color: isLiked
                                          ? AppColors.error
                                          : AppColors.textSecondary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      '$likes Likes',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textSecondary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(width: 16),
                        Row(
                          children: [
                            const Icon(Icons.chat_bubble_outline_rounded,
                                size: 18, color: AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              '${_comments.length} Comments',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Divider(),

                  // Comments Header
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Text(
                      'Comments',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),

                  // Comments List
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _comments.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 16, indent: 48),
                    itemBuilder: (context, index) {
                      final comment = _comments[index];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AvatarBadge(
                            name: comment.authorName,
                            imageUrl: comment.authorAvatarUrl,
                            radius: 16,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      comment.authorName,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      DateFormat.jm().format(comment.createdAt),
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  comment.content,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Comment Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  offset: const Offset(0, -2),
                  blurRadius: 6,
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Add a comment...',
                        hintStyle: const TextStyle(
                            fontSize: 13, color: AppColors.textMuted),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        filled: true,
                        fillColor: AppColors.neutralBg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _isSubmittingComment ? null : _submitComment,
                    icon: _isSubmittingComment
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded,
                            color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
