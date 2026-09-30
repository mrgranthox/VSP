import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/feed_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/poll_widget.dart';
import '../../widgets/post_type_selector.dart';

class PostComposerScreen extends StatefulWidget {
  const PostComposerScreen({super.key});

  @override
  State<PostComposerScreen> createState() => _PostComposerScreenState();
}

class _PostComposerScreenState extends State<PostComposerScreen> {
  final TextEditingController _contentCtrl = TextEditingController();
  String _selectedType = 'UPDATE';
  String _visibility = 'Anyone (Public)';
  bool _isPublishing = false;
  String? _attachedImageUrl;
  PollData? _draftPoll;

  @override
  void dispose() {
    _contentCtrl.dispose();
    super.dispose();
  }

  void _onTypeChanged(String type) {
    setState(() => _selectedType = type);
    if (type == 'PHOTO') {
      setState(() {
        _attachedImageUrl = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';
      });
    } else if (type == 'POLL') {
      _showPollCreator();
    } else if (type == 'ARTICLE') {
      context.push('/articles/create');
    }
  }

  void _showPollCreator() {
    final qCtrl = TextEditingController();
    final opt1Ctrl = TextEditingController();
    final opt2Ctrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLg)),
      ),
      builder: (ctx) => Padding(
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
            const Text(
              'Create a Trade Poll',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: qCtrl,
              decoration: const InputDecoration(
                labelText: 'Your Question',
                hintText: 'e.g. Which breaker brand do you trust most?',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: opt1Ctrl,
              decoration: const InputDecoration(
                labelText: 'Option 1',
                hintText: 'e.g. Schneider Electric',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: opt2Ctrl,
              decoration: const InputDecoration(
                labelText: 'Option 2',
                hintText: 'e.g. ABB / Hager',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: Colors.white,
                ),
                onPressed: () {
                  if (qCtrl.text.trim().isNotEmpty &&
                      opt1Ctrl.text.trim().isNotEmpty &&
                      opt2Ctrl.text.trim().isNotEmpty) {
                    setState(() {
                      _draftPoll = PollData(
                        id: 'draft-${DateTime.now().millisecondsSinceEpoch}',
                        question: qCtrl.text.trim(),
                        options: [
                          PollOptionData(id: 'o1', label: opt1Ctrl.text.trim(), votesCount: 0, percentage: 0),
                          PollOptionData(id: 'o2', label: opt2Ctrl.text.trim(), votesCount: 0, percentage: 0),
                        ],
                        totalVotes: 0,
                      );
                    });
                    Navigator.pop(ctx);
                  }
                },
                child: const Text('Attach Poll to Post'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _publish() async {
    final text = _contentCtrl.text.trim();
    if (text.isEmpty && _draftPoll == null) return;

    setState(() => _isPublishing = true);

    final success = await context.read<FeedProvider>().createPost(
      text.isNotEmpty ? text : (_draftPoll?.question ?? ''),
      _attachedImageUrl,
    );

    if (mounted) {
      setState(() => _isPublishing = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Published to vocational trade community!')),
        );
        context.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.darkText),
          onPressed: () => context.pop(),
        ),
        title: const Text('Share Update', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brand,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onPressed: _isPublishing ? null : _publish,
              child: _isPublishing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Post', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Post Type Selector
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: PostTypeSelector(
                selectedType: _selectedType,
                onSelected: _onTypeChanged,
              ),
            ),
            const Divider(height: 1),

            // Author Profile & Visibility
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const AvatarBadge(name: 'You', radius: 22),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'You',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      PopupMenuButton<String>(
                        onSelected: (val) => setState(() => _visibility = val),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.screenBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.public, size: 12, color: AppColors.midText),
                              const SizedBox(width: 4),
                              Text(
                                _visibility,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                              const Icon(Icons.arrow_drop_down, size: 14, color: AppColors.midText),
                            ],
                          ),
                        ),
                        itemBuilder: (_) => [
                          const PopupMenuItem(value: 'Anyone (Public)', child: Text('Anyone (Public)')),
                          const PopupMenuItem(value: 'Connections Only', child: Text('Connections Only')),
                          const PopupMenuItem(value: 'Trade Guild Members', child: Text('Trade Guild Members')),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Content Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _contentCtrl,
                maxLines: 6,
                decoration: const InputDecoration(
                  hintText: 'What trade knowledge, finished job, or question do you want to share? Use #tags or @mentions...',
                  border: InputBorder.none,
                ),
              ),
            ),

            // Attached Poll Preview
            if (_draftPoll != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Stack(
                  children: [
                    PollWidget(poll: _draftPoll!),
                    Positioned(
                      top: 12,
                      right: 12,
                      child: IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => setState(() => _draftPoll = null),
                      ),
                    ),
                  ],
                ),
              ),

            // Attached Image Preview
            if (_attachedImageUrl != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Image.network(_attachedImageUrl!, fit: BoxFit.cover),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: CircleAvatar(
                        backgroundColor: Colors.black54,
                        radius: 16,
                        child: IconButton(
                          icon: const Icon(Icons.close, color: Colors.white, size: 16),
                          onPressed: () => setState(() => _attachedImageUrl = null),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Quick Hashtag Suggestions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Wrap(
                spacing: 8,
                children: [
                  '#SolarInstallation',
                  '#GhanaTrades',
                  '#ElectricalWork',
                  '#SafetyStandards',
                ].map((tag) {
                  return ActionChip(
                    label: Text(tag, style: const TextStyle(fontSize: 11)),
                    onPressed: () {
                      _contentCtrl.text = '${_contentCtrl.text} $tag'.trim();
                    },
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
