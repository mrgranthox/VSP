import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/skill_chip.dart';

class SkillEndorsementsScreen extends StatefulWidget {
  final String? userId;

  const SkillEndorsementsScreen({super.key, this.userId});

  @override
  State<SkillEndorsementsScreen> createState() => _SkillEndorsementsScreenState();
}

class _SkillEndorsementsScreenState extends State<SkillEndorsementsScreen> {
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _showAddSkillModal(BuildContext context) {
    final linkedin = context.read<LinkedInProvider>();
    final skills = linkedin.taxonomy;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLg)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final query = _searchCtrl.text.toLowerCase();
          final filtered = skills
              .where((s) => s.name.toLowerCase().contains(query) || s.category.toLowerCase().contains(query))
              .toList();

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: SizedBox(
              height: 460,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Add Vocational Skills',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _searchCtrl,
                    onChanged: (_) => setModalState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search skills (e.g. Inverter Wiring, PVC Plumbing)...',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: filtered.isEmpty
                        ? const Center(
                            child: Text(
                              'No matching vocational skills found',
                              style: TextStyle(color: AppColors.midText),
                            ),
                          )
                        : ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final sk = filtered[index];
                              return ListTile(
                                title: Text(sk.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text(sk.category, style: const TextStyle(fontSize: 12)),
                                trailing: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.brand,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                    ),
                                  ),
                                  onPressed: () {
                                    Navigator.pop(ctx);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Added "${sk.name}" to your profile skills!')),
                                    );
                                  },
                                  child: const Text('Add'),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final linkedin = context.watch<LinkedInProvider>();
    final skills = linkedin.userSkills;

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Skills & Endorsements',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.brand, size: 28),
            tooltip: 'Add Skill',
            onPressed: () => _showAddSkillModal(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Intro banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Vocational Skill Verification',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Trade skills with 5+ peer endorsements or verified skill assessments rank 40% higher in client contractor searches.',
                    style: TextStyle(fontSize: 12.5, color: AppColors.midText, height: 1.3),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.brand,
                        side: const BorderSide(color: AppColors.brand),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                        ),
                      ),
                      icon: const Icon(Icons.quiz_outlined, size: 18),
                      label: const Text('Take Skill Assessment Quiz'),
                      onPressed: () {
                        if (skills.isNotEmpty) {
                          context.push('/skills/${skills.first.skillId}/assessment');
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Skills List
            const Text(
              'Your Verified Competencies',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.darkText),
            ),
            const SizedBox(height: 10),

            for (final sk in skills)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        SkillChip(
                          name: sk.name,
                          endorsementsCount: sk.endorsementsCount,
                          isEndorsedByMe: sk.isEndorsedByMe,
                          isVerified: true,
                          onEndorse: () => linkedin.toggleSkillEndorsement(sk.id),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () => context.push('/skills/${sk.skillId}/assessment'),
                          child: const Text('Test Skill', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                    if (sk.endorsementsCount > 0) ...[
                      const SizedBox(height: 8),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
                      Text(
                        '${sk.endorsementsCount} colleague${sk.endorsementsCount == 1 ? "" : "s"} endorsed this skill',
                        style: const TextStyle(fontSize: 12, color: AppColors.midText),
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
