import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class ShareRepostSheet extends StatefulWidget {
  final String postId;
  final String postContent;
  final String authorName;
  final Future<void> Function(String? comment)? onRepost;

  const ShareRepostSheet({
    super.key,
    required this.postId,
    required this.postContent,
    required this.authorName,
    this.onRepost,
  });

  static Future<void> show(
    BuildContext context, {
    required String postId,
    required String postContent,
    required String authorName,
    Future<void> Function(String? comment)? onRepost,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLg)),
      ),
      builder: (_) => ShareRepostSheet(
        postId: postId,
        postContent: postContent,
        authorName: authorName,
        onRepost: onRepost,
      ),
    );
  }

  @override
  State<ShareRepostSheet> createState() => _ShareRepostSheetState();
}

class _ShareRepostSheetState extends State<ShareRepostSheet> {
  bool _showCommentInput = false;
  final TextEditingController _commentCtrl = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (!_showCommentInput) ...[
              ListTile(
                leading: const Icon(Icons.repeat, color: AppColors.darkText),
                title: const Text(
                  'Repost instantly',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                subtitle: const Text('Instantly share this update with your trade network'),
                onTap: () async {
                  Navigator.pop(context);
                  if (widget.onRepost != null) {
                    await widget.onRepost!(null);
                  }
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Reposted to your trade network!')),
                    );
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.edit_note, color: AppColors.darkText),
                title: const Text(
                  'Repost with your thoughts',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                subtitle: const Text('Add your perspective or trade experience to this post'),
                onTap: () => setState(() => _showCommentInput = true),
              ),
              const Divider(height: 16),
              ListTile(
                leading: const Icon(Icons.link, color: AppColors.darkText),
                title: const Text(
                  'Copy link to post',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                onTap: () {
                  Clipboard.setData(ClipboardData(text: 'https://vsp.app/posts/${widget.postId}'));
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Post link copied to clipboard')),
                  );
                },
              ),
              const SizedBox(height: 8),
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Add your thoughts',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _showCommentInput = false),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _commentCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'What do you think about this project or tip?',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Original post preview
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.screenBg,
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.authorName,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.postContent,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.midText, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                    ),
                  ),
                  onPressed: _isSubmitting
                      ? null
                      : () async {
                          setState(() => _isSubmitting = true);
                          Navigator.pop(context);
                          if (widget.onRepost != null) {
                            await widget.onRepost!(_commentCtrl.text.trim());
                          }
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Reposted with your thoughts!')),
                            );
                          }
                        },
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Post', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }
}
