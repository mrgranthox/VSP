import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class BlockedUserItem {
  final String id;
  final String name;
  final String headline;
  final String? avatarUrl;
  final DateTime blockedAt;

  BlockedUserItem({
    required this.id,
    required this.name,
    required this.headline,
    this.avatarUrl,
    required this.blockedAt,
  });
}

class BlockListScreen extends StatefulWidget {
  const BlockListScreen({super.key});

  @override
  State<BlockListScreen> createState() => _BlockListScreenState();
}

class _BlockListScreenState extends State<BlockListScreen> {
  late List<BlockedUserItem> _blockedUsers;

  @override
  void initState() {
    super.initState();
    _blockedUsers = [
      BlockedUserItem(
        id: 'block-1',
        name: 'Unverified Subcontractor Corp',
        headline: 'Flagged for multiple spam estimates & unlicensed solicitation',
        blockedAt: DateTime.now().subtract(const Duration(days: 14)),
      ),
      BlockedUserItem(
        id: 'block-2',
        name: 'Travis Sterling',
        headline: 'Harassment & unpermitted job site safety violations',
        blockedAt: DateTime.now().subtract(const Duration(days: 45)),
      ),
    ];
  }

  void _confirmUnblock(BlockedUserItem user) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Unblock ${user.name}?'),
        content: Text(
          '${user.name} will be able to view your vocational profile, feed posts, and send you direct messages again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _blockedUsers.removeWhere((u) => u.id == user.id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Unblocked ${user.name}'),
                  action: SnackBarAction(
                    label: 'Undo',
                    onPressed: () {
                      setState(() {
                        _blockedUsers.add(user);
                      });
                    },
                  ),
                ),
              );
            },
            child: const Text('Unblock', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Blocked Accounts',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Informational Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield_outlined, color: AppColors.brand, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'About Blocking on VSP',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Blocked accounts cannot view your vocational profile, feed posts, job proposals, or message you. We do not notify users when you block or unblock them.',
                        style: TextStyle(fontSize: 12, color: AppColors.midText, height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_blockedUsers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.check_circle_outline, size: 54, color: AppColors.success),
                    SizedBox(height: 14),
                    Text(
                      'No blocked accounts',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'When you block someone from their profile or post, they will appear in this list.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.midText, fontSize: 13),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            Text(
              'Blocked (${_blockedUsers.length})',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.midText),
            ),
            const SizedBox(height: 10),
            ..._blockedUsers.map((u) {
              final dateStr = DateFormat('MMM d, yyyy').format(u.blockedAt);
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0.5,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: const Color(0xFFE5E7EB),
                        child: Text(
                          u.name.substring(0, 1),
                          style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.darkText),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              u.name,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              u.headline,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, color: AppColors.midText),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Blocked on $dateStr',
                              style: const TextStyle(fontSize: 10, color: AppColors.midText),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        ),
                        onPressed: () => _confirmUnblock(u),
                        child: const Text('Unblock', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}
