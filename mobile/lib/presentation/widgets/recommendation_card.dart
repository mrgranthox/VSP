import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'avatar_badge.dart';

class RecommendationCard extends StatefulWidget {
  final String authorName;
  final String? authorHeadline;
  final String? authorAvatarUrl;
  final String? relationship;
  final String text;
  final DateTime createdAt;
  final String status;
  final VoidCallback? onAccept;
  final VoidCallback? onDecline;

  const RecommendationCard({
    super.key,
    required this.authorName,
    this.authorHeadline,
    this.authorAvatarUrl,
    this.relationship,
    required this.text,
    required this.createdAt,
    this.status = 'ACCEPTED',
    this.onAccept,
    this.onDecline,
  });

  @override
  State<RecommendationCard> createState() => _RecommendationCardState();
}

class _RecommendationCardState extends State<RecommendationCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat.yMMMd().format(widget.createdAt);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(14),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarBadge(
                name: widget.authorName,
                imageUrl: widget.authorAvatarUrl,
                radius: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.authorName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.darkText,
                      ),
                    ),
                    if (widget.authorHeadline != null) ...[
                      const SizedBox(height: 1),
                      Text(
                        widget.authorHeadline!,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.midText,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          dateStr,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.lightText,
                          ),
                        ),
                        if (widget.relationship != null) ...[
                          const Text(' • ', style: TextStyle(color: AppColors.lightText)),
                          Expanded(
                            child: Text(
                              widget.relationship!,
                              style: const TextStyle(
                                fontSize: 11,
                                fontStyle: FontStyle.italic,
                                color: AppColors.midText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            widget.text,
            maxLines: _isExpanded ? null : 3,
            overflow: _isExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.darkText,
              height: 1.4,
            ),
          ),
          if (widget.text.length > 140)
            InkWell(
              onTap: () => setState(() => _isExpanded = !_isExpanded),
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  _isExpanded ? 'Show less' : 'Read more',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.brand,
                  ),
                ),
              ),
            ),
          if (widget.status == 'PENDING' && (widget.onAccept != null || widget.onDecline != null)) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (widget.onDecline != null)
                  TextButton(
                    onPressed: widget.onDecline,
                    child: const Text('Decline', style: TextStyle(color: AppColors.danger)),
                  ),
                const SizedBox(width: 8),
                if (widget.onAccept != null)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                      ),
                    ),
                    onPressed: widget.onAccept,
                    child: const Text('Add to Profile', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
