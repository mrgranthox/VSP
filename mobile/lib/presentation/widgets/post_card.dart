import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/post_model.dart';
import '../providers/feed_provider.dart';
import 'avatar_badge.dart';
import 'degree_chip.dart';
import 'hashtag_chip.dart';
import 'mention_text.dart';
import 'nested_comment_tile.dart';
import 'open_to_work_frame.dart';
import 'poll_widget.dart';
import 'premium_badge.dart';
import 'reaction_count_row.dart';
import 'reaction_picker.dart';
import 'share_repost_sheet.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final VoidCallback? onLike;
  final VoidCallback? onComment;
  final VoidCallback? onSave;
  final VoidCallback? onShare;
  final VoidCallback? onTap;
  final VoidCallback? onLikeTap;
  final VoidCallback? onCommentTap;
  final VoidCallback? onShareTap;
  final VoidCallback? onSendTap;

  const PostCard({
    super.key,
    required this.post,
    this.onLike,
    this.onComment,
    this.onSave,
    this.onShare,
    this.onTap,
    this.onLikeTap,
    this.onCommentTap,
    this.onShareTap,
    this.onSendTap,
  });

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool _showComments = false;
  final TextEditingController _commentCtrl = TextEditingController();
  String? _replyingToParentId;
  String? _replyingToName;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inDays > 0) return '${diff.inDays}d';
    if (diff.inHours > 0) return '${diff.inHours}h';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m';
    return 'now';
  }

  ReactionItemData _getCurrentReaction() {
    if (widget.post.reactionType == null) {
      return kReactions[0]; // Like
    }
    return kReactions.firstWhere(
      (r) => r.type == widget.post.reactionType,
      orElse: () => kReactions[0],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currentReaction = _getCurrentReaction();
    final hasReacted = widget.post.reactionType != null || widget.post.isLiked;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.border.withValues(alpha: 0.6)),
          bottom: BorderSide(color: AppColors.border.withValues(alpha: 0.6)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Repost banner if applicable
          if (widget.post.repostOfId != null)
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, top: 10),
              child: Row(
                children: [
                  const Icon(Icons.repeat, size: 14, color: AppColors.midText),
                  const SizedBox(width: 6),
                  Text(
                    '${widget.post.authorName} reposted',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.midText,
                    ),
                  ),
                ],
              ),
            ),

          // Author Row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                OpenToWorkFrame(
                  isOpenToWork: widget.post.isOpenToWork,
                  radius: 22,
                  child: PremiumBadge(
                    isPremium: widget.post.isPremium,
                    child: AvatarBadge(
                      name: widget.post.authorName,
                      imageUrl: widget.post.authorAvatarUrl,
                      radius: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              widget.post.authorName,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                fontSize: 14.5,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          DegreeChip(degree: widget.post.connectionDegree),
                        ],
                      ),
                      if (widget.post.authorHeadline != null) ...[
                        const SizedBox(height: 1),
                        Text(
                          widget.post.authorHeadline!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: AppColors.midText,
                            fontSize: 11.5,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            _formatTimeAgo(widget.post.createdAt),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.lightText,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text('•', style: TextStyle(color: AppColors.lightText, fontSize: 10)),
                          const SizedBox(width: 4),
                          const Icon(Icons.public, size: 12, color: AppColors.lightText),
                        ],
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz, color: AppColors.midText),
                  onSelected: (val) {
                    if (val == 'share') {
                      ShareRepostSheet.show(
                        context,
                        postId: widget.post.id,
                        postContent: widget.post.content,
                        authorName: widget.post.authorName,
                        onRepost: (c) => context.read<FeedProvider>().repostPost(widget.post.id, c),
                      );
                    } else if (val == 'save') {
                      if (widget.onSave != null) widget.onSave!();
                    } else if (val == 'report') {
                      context.push('/report/post/${widget.post.id}');
                    }
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'save', child: Text('Save Post')),
                    const PopupMenuItem(value: 'share', child: Text('Repost to Network')),
                    const PopupMenuItem(value: 'report', child: Text('Report Post')),
                  ],
                ),
              ],
            ),
          ),

          // Content body
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: MentionText(
              text: widget.post.content,
              style: theme.textTheme.bodyMedium?.copyWith(
                height: 1.4,
                fontSize: 14,
                color: AppColors.darkText,
              ),
            ),
          ),

          // Hashtags chips
          if (widget.post.hashtags.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: widget.post.hashtags.map((tag) => HashtagChip(tag: tag)).toList(),
              ),
            ),

          // Poll if present
          if (widget.post.poll != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: PollWidget(
                poll: PollData(
                  id: widget.post.poll!.id,
                  question: widget.post.poll!.question,
                  totalVotes: widget.post.poll!.totalVotes,
                  myVotedOptionId: widget.post.poll!.myVotedOptionId,
                  isClosed: widget.post.poll!.isClosed,
                  options: widget.post.poll!.options
                      .map((o) => PollOptionData(
                            id: o.id,
                            label: o.label,
                            votesCount: o.voteCount,
                            percentage: o.percentage,
                          ))
                      .toList(),
                ),
                onVote: (optId) => context.read<FeedProvider>().votePoll(widget.post.poll!.id, optId),
              ),
            ),

          // Image if present
          if (widget.post.imageUrl != null && widget.post.imageUrl!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: InkWell(
                onTap: widget.onTap ?? () => context.push('/customer/feed/${widget.post.id}'),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    widget.post.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppColors.screenBg,
                      child: const Center(
                        child: Icon(Icons.broken_image_outlined, color: AppColors.midText),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Embedded repost preview if present
          if (widget.post.repostOf != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.screenBg,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      AvatarBadge(name: widget.post.repostOf!.authorName, radius: 12),
                      const SizedBox(width: 8),
                      Text(
                        widget.post.repostOf!.authorName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.post.repostOf!.content,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12.5, color: AppColors.darkText),
                  ),
                ],
              ),
            ),

          // Social Counters Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
            child: Row(
              children: [
                ReactionCountRow(
                  reactionCounts: widget.post.reactionCounts,
                  totalCount: widget.post.likesCount,
                  onTap: () {
                    ReactionPicker.show(context).then((selected) {
                      if (selected != null && context.mounted) {
                        context.read<FeedProvider>().reactToPost(widget.post.id, selected);
                      }
                    });
                  },
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () {
                    setState(() => _showComments = !_showComments);
                    if (_showComments) {
                      context.read<FeedProvider>().loadPostComments(widget.post.id);
                    }
                  },
                  child: Text(
                    '${widget.post.commentsCount} comments • ${widget.post.repostsCount} reposts',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppColors.midText,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1, indent: 16, endIndent: 16),

          // Action Buttons Bar (LinkedIn-style 4 buttons)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // LIKE / REACTION BUTTON
                GestureDetector(
                  onLongPress: () async {
                    HapticFeedback.heavyImpact();
                    final selected = await ReactionPicker.show(context);
                    if (selected != null && context.mounted) {
                      context.read<FeedProvider>().reactToPost(widget.post.id, selected);
                    }
                  },
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: hasReacted ? currentReaction.color : AppColors.midText,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                    onPressed: () {
                      if (widget.onLike != null) {
                        widget.onLike!();
                      } else if (widget.onLikeTap != null) {
                        widget.onLikeTap!();
                      } else {
                        context.read<FeedProvider>().toggleLike(widget.post.id);
                      }
                    },
                    icon: hasReacted
                        ? Text(currentReaction.emoji, style: const TextStyle(fontSize: 17))
                        : const Icon(Icons.thumb_up_outlined, size: 17),
                    label: Text(
                      hasReacted ? currentReaction.label : 'Like',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: hasReacted ? FontWeight.w800 : FontWeight.w600,
                      ),
                    ),
                  ),
                ),

                // COMMENT BUTTON
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: _showComments ? AppColors.brand : AppColors.midText,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  onPressed: () {
                    if (widget.onComment != null) {
                      widget.onComment!();
                    } else if (widget.onCommentTap != null) {
                      widget.onCommentTap!();
                    } else {
                      setState(() => _showComments = !_showComments);
                      if (_showComments) {
                        context.read<FeedProvider>().loadPostComments(widget.post.id);
                      }
                    }
                  },
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 17),
                  label: const Text('Comment', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),

                // REPOST BUTTON
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: widget.post.isReposted ? AppColors.brand : AppColors.midText,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  onPressed: () {
                    ShareRepostSheet.show(
                      context,
                      postId: widget.post.id,
                      postContent: widget.post.content,
                      authorName: widget.post.authorName,
                      onRepost: (comment) =>
                          context.read<FeedProvider>().repostPost(widget.post.id, comment),
                    );
                  },
                  icon: const Icon(Icons.repeat, size: 17),
                  label: const Text('Repost', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),

                // SEND / SHARE BUTTON
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.midText,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: 'https://vsp.app/posts/${widget.post.id}'));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Post link copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.send_rounded, size: 17),
                  label: const Text('Send', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),

          // Expandable Comments Drawer
          if (_showComments) ...[
            const Divider(height: 1),
            Consumer<FeedProvider>(
              builder: (context, feed, _) {
                final comments = feed.commentsByPostId[widget.post.id] ?? [];

                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Reply indicator if replying
                      if (_replyingToName != null) ...[
                        Row(
                          children: [
                            Text(
                              'Replying to $_replyingToName',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.brand,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => setState(() {
                                _replyingToParentId = null;
                                _replyingToName = null;
                              }),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                      ],

                      // Comment input box
                      Row(
                        children: [
                          const AvatarBadge(name: 'You', radius: 15),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _commentCtrl,
                              decoration: InputDecoration(
                                hintText: _replyingToName != null ? 'Add a reply...' : 'Add a trade comment...',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(20),
                                  borderSide: const BorderSide(color: AppColors.border),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const Icon(Icons.send_rounded, color: AppColors.brand),
                            onPressed: () {
                              final text = _commentCtrl.text.trim();
                              if (text.isNotEmpty) {
                                feed.addComment(widget.post.id, text, _replyingToParentId);
                                _commentCtrl.clear();
                                setState(() {
                                  _replyingToParentId = null;
                                  _replyingToName = null;
                                });
                              }
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Comments list
                      if (comments.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text(
                            'No comments yet. Start the conversation!',
                            style: TextStyle(color: AppColors.midText, fontSize: 13),
                          ),
                        )
                      else
                        for (final c in comments)
                          NestedCommentTile(
                            comment: NestedCommentData(
                              id: c.id,
                              authorName: c.authorName,
                              authorAvatarUrl: c.authorAvatarUrl,
                              authorHeadline: c.authorHeadline,
                              content: c.content,
                              createdAt: c.createdAt,
                              replies: c.replies
                                  .map((r) => NestedCommentData(
                                        id: r.id,
                                        authorName: r.authorName,
                                        authorAvatarUrl: r.authorAvatarUrl,
                                        authorHeadline: r.authorHeadline,
                                        content: r.content,
                                        createdAt: r.createdAt,
                                      ))
                                  .toList(),
                            ),
                            onReply: (parentId, name) {
                              setState(() {
                                _replyingToParentId = parentId;
                                _replyingToName = name;
                              });
                            },
                          ),
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
