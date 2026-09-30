import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/vsp_button.dart';

class GroupDetailScreen extends StatefulWidget {
  final String groupId;

  const GroupDetailScreen({super.key, required this.groupId});

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  final TextEditingController _postCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LinkedInProvider>().selectGroup(widget.groupId);
    });
  }

  @override
  void dispose() {
    _postCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final group = provider.currentGroup;

    if (group == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trade Group')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: Text(group.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: ListView(
        children: [
          // Banner / Header Card
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.brandLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(Icons.group_work_rounded, color: AppColors.brandDark, size: 32),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            group.name,
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${group.privacy} Group • ${group.memberCount} members',
                            style: const TextStyle(fontSize: 13, color: AppColors.midText),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (group.description != null)
                  Text(
                    group.description!,
                    style: const TextStyle(fontSize: 14, height: 1.4, color: Color(0xFF374151)),
                  ),
                const SizedBox(height: 16),
                VspButton(
                  text: group.isMember ? 'Leave Group' : 'Join Group',
                  variant: group.isMember ? VspButtonVariant.danger : VspButtonVariant.primary,
                  onPressed: () => provider.toggleGroupMembership(group.id),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Community discussion creator
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Post in this Community',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _postCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Share a job lead, technical question, or trade tip...',
                    hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    onPressed: () {
                      if (_postCtrl.text.trim().isNotEmpty) {
                        _postCtrl.clear();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Discussion post shared with group members!')),
                        );
                      }
                    },
                    child: const Text('Post', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Discussion feed header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Recent Group Discussions',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.darkText),
            ),
          ),

          // Sample discussions
          _buildSampleDiscussion(
            author: 'Kofi Owusu',
            headline: 'Journeyman Electrician',
            time: '2h ago',
            content: 'Has anyone worked with the new hybrid inverters requiring external neutral-ground relays? Looking for recommendations on testing procedures before local authority sign-off.',
            repliesCount: 8,
          ),
          _buildSampleDiscussion(
            author: 'Emmanuel Boakye',
            headline: 'Master Plumber • Commercial & Residential',
            time: 'Yesterday',
            content: 'Important heads up for contractors bidding on public works in Greater Accra: updated certification forms are now required for municipal water interconnect permits.',
            repliesCount: 14,
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSampleDiscussion({
    required String author,
    required String headline,
    required String time,
    required String content,
    required int repliesCount,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.brandLight,
                child: Text(
                  author[0],
                  style: const TextStyle(color: AppColors.brandDark, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(author, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('$headline • $time', style: const TextStyle(fontSize: 11, color: AppColors.midText)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(content, style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.darkText)),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.thumb_up_alt_outlined, size: 16, color: AppColors.midText),
              const SizedBox(width: 4),
              const Text('Like', style: TextStyle(fontSize: 12, color: AppColors.midText)),
              const SizedBox(width: 16),
              const Icon(Icons.chat_bubble_outline, size: 16, color: AppColors.midText),
              const SizedBox(width: 4),
              Text('$repliesCount comments', style: const TextStyle(fontSize: 12, color: AppColors.midText)),
            ],
          ),
        ],
      ),
    );
  }
}
