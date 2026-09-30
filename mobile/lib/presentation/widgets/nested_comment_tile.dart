import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'avatar_badge.dart';

class NestedCommentData {
  final String id;
  final String authorName;
  final String? authorAvatarUrl;
  final String? authorHeadline;
  final String content;
  final DateTime createdAt;
  final List<NestedCommentData> replies;

  const NestedCommentData({
    required this.id,
    required this.authorName,
    this.authorAvatarUrl,
    this.authorHeadline,
    required this.content,
    required this.createdAt,
    this.replies = const [],
  });
}

class NestedCommentTile extends StatefulWidget {
  final NestedCommentData comment;
  final int depth;
  final Function(String parentCommentId, String authorName)? onReply;

  const NestedCommentTile({
    super.key,
    required this.comment,
    this.depth = 0,
    this.onReply,
  });

  @override
  State<NestedCommentTile> createState() => _NestedCommentTileState();
}

class _NestedCommentTileState extends State<NestedCommentTile> {
  bool _showReplies = false;

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inDays > 0) return '${diff.inDays}d';
    if (diff.inHours > 0) return '${diff.inHours}h';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m';
    return 'now';
  }

  @override
  Widget build(BuildContext context) {
    final leftPadding = widget.depth == 0 ? 0.0 : 28.0;

    return Padding(
      padding: EdgeInsets.only(left: leftPadding, top: 8, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarBadge(
                name: widget.comment.authorName,
                imageUrl: widget.comment.authorAvatarUrl,
                radius: widget.depth == 0 ? 16 : 14,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.screenBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              widget.comment.authorName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            _formatTimeAgo(widget.comment.createdAt),
                            style: const TextStyle(
                              color: AppColors.midText,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                      if (widget.comment.authorHeadline != null) ...[
                        Text(
                          widget.comment.authorHeadline!,
                          style: const TextStyle(
                            color: AppColors.midText,
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                      ],
                      Text(
                        widget.comment.content,
                        style: const TextStyle(
                          color: AppColors.darkText,
                          fontSize: 13,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 40, top: 4),
            child: Row(
              children: [
                if (widget.depth < 2)
                  InkWell(
                    onTap: () {
                      if (widget.onReply != null) {
                        widget.onReply!(widget.comment.id, widget.comment.authorName);
                      }
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Text(
                        'Reply',
                        style: TextStyle(
                          color: AppColors.brand,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                if (widget.comment.replies.isNotEmpty) ...[
                  const SizedBox(width: 12),
                  InkWell(
                    onTap: () => setState(() => _showReplies = !_showReplies),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      child: Text(
                        _showReplies
                            ? 'Hide replies'
                            : 'View ${widget.comment.replies.length} replies',
                        style: const TextStyle(
                          color: AppColors.midText,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_showReplies && widget.comment.replies.isNotEmpty)
            for (final r in widget.comment.replies)
              NestedCommentTile(
                comment: r,
                depth: widget.depth + 1,
                onReply: widget.onReply,
              ),
        ],
      ),
    );
  }
}
