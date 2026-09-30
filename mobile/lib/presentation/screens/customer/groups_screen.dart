import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';

class GroupsScreen extends StatefulWidget {
  const GroupsScreen({super.key});

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final groups = provider.groups.where((g) {
      if (_search.isEmpty) return true;
      final q = _search.toLowerCase();
      return g.name.toLowerCase().contains(q) ||
          (g.description?.toLowerCase().contains(q) ?? false);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Trade Communities & Groups', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadGroups(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Search Input
            TextField(
              decoration: InputDecoration(
                hintText: 'Search vocational groups, unions, circles...',
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
              onChanged: (val) => setState(() => _search = val),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recommended Groups (${groups.length})',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                Text(
                  '${groups.where((g) => g.isMember).length} Joined',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.brand),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (groups.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.groups_outlined, size: 48, color: AppColors.midText),
                      SizedBox(height: 12),
                      Text('No trade groups match your search.', style: TextStyle(color: AppColors.midText)),
                    ],
                  ),
                ),
              )
            else
              ...groups.map((grp) => _buildGroupCard(context, provider, grp)),
          ],
        ),
      ),
    );
  }

  Widget _buildGroupCard(BuildContext context, LinkedInProvider provider, dynamic grp) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      elevation: 0.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          provider.selectGroup(grp.id);
          context.push('/groups/${grp.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.brandLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Icon(Icons.group_work_rounded, color: AppColors.brandDark, size: 28),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                grp.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.darkText),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: grp.privacy == 'OPEN' ? AppColors.successLight : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                grp.privacy,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: grp.privacy == 'OPEN' ? AppColors.successDark : AppColors.midText,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${grp.memberCount} vocational members',
                          style: const TextStyle(fontSize: 12, color: AppColors.midText),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (grp.description != null) ...[
                const SizedBox(height: 10),
                Text(
                  grp.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563), height: 1.3),
                ),
              ],
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Active trade forum', style: TextStyle(fontSize: 11, color: AppColors.lightText)),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: grp.isMember ? AppColors.midText : AppColors.brand,
                      side: BorderSide(color: grp.isMember ? AppColors.border : AppColors.brand),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                    onPressed: () => provider.toggleGroupMembership(grp.id),
                    child: Text(
                      grp.isMember ? 'Joined' : '+ Join Group',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
