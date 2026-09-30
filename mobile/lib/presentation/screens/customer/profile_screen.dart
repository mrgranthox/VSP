import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/profile_sections_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/profile_strength_meter.dart';
import '../../widgets/skill_chip.dart';
import '../../widgets/recommendation_card.dart';

/// LinkedIn-Parity Profile Screen for VSP:
/// - Cover banner with overlapping avatar and #OpenToWork badge
/// - Professional headline, location, connection counts
/// - "Open to", "Add section", "More" action buttons
/// - Analytics card (Profile views, Post impressions, Search appearances) wired to detailed analytics
/// - About section
/// - Featured projects & items
/// - Vocational Experience & Project history
/// - Education & Technical Apprenticeships
/// - Licenses & Trade Certifications
/// - Skills & Endorsements with interactive endorsement buttons
/// - Peer & Client Recommendations
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final auth = context.watch<AuthProvider>();
    final linkedin = context.watch<LinkedInProvider>();
    final user = auth.currentUser;
    final fullName = user?.profile?.fullName ?? 'Trades Leader';
    final email = user?.email ?? user?.phone ?? 'customer@example.com';
    final bio = user?.profile?.bio ??
        'Vocational Project Lead & Facilities Client | Coordinating residential and commercial skilled trades across Greater Accra.';

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Text(
          fullName,
          style: (theme.textTheme.titleMedium ?? const TextStyle())
              .copyWith(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            tooltip: 'Viewers',
            icon: const Icon(Icons.remove_red_eye_outlined),
            onPressed: () => context.push('/who-viewed-profile'),
          ),
          IconButton(
            tooltip: 'Settings',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // 1. Cover Banner & Overlapping Avatar (LinkedIn Style)
            Container(
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      // LinkedIn Cover Banner
                      Container(
                        height: 110,
                        width: double.infinity,
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF0A66C2), Color(0xFF004182)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Align(
                          alignment: Alignment.topRight,
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: Colors.black.withValues(alpha: 0.3),
                              child: const Icon(
                                Icons.camera_alt_outlined,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Overlapping Profile Picture with #OpenToWork frame
                      Positioned(
                        left: 16,
                        bottom: -40,
                        child: Stack(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: linkedin.isOpenToWork ? AppColors.success : Colors.white,
                                  width: 4,
                                ),
                              ),
                              child: AvatarBadge(name: fullName, radius: 40),
                            ),
                            if (linkedin.isOpenToWork)
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.success,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    '#OPENTOWORK',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 7.5,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      // Edit profile icon top right below banner
                      Positioned(
                        right: 16,
                        bottom: -36,
                        child: IconButton(
                          tooltip: 'Edit Profile',
                          icon: Icon(
                            Icons.edit_outlined,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          onPressed: () => context.push('/edit-profile'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),

                  // 2. Profile Details & Headline
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              fullName,
                              style: (theme.textTheme.titleLarge ?? const TextStyle()).copyWith(
                                fontWeight: FontWeight.w800,
                                fontSize: 22,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(
                              Icons.verified,
                              size: 18,
                              color: AppColors.brand,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Certified Master Tradesperson & Project Lead | Accra, Ghana',
                          style: (theme.textTheme.bodyMedium ?? const TextStyle()).copyWith(
                            color: colorScheme.onSurface,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Greater Accra Region, Ghana • $email',
                          style: (theme.textTheme.bodySmall ?? const TextStyle()).copyWith(
                            color: colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: () => context.push('/connections'),
                          child: const Text(
                            '500+ vocational connections',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.brand,
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // 3. LinkedIn Action Buttons: Open to, Add section, More
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.brand,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                                  ),
                                ),
                                onPressed: () {
                                  HapticFeedback.lightImpact();
                                  context.push('/customer/open-to-work');
                                },
                                child: Text(
                                  linkedin.isOpenToWork ? '#OpenToWork' : 'Set Available',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.brand,
                                  side: const BorderSide(color: AppColors.brand, width: 1.5),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                                  ),
                                ),
                                onPressed: () {
                                  HapticFeedback.lightImpact();
                                  _showAddSectionSheet(context);
                                },
                                child: const Text(
                                  'Add section',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: colorScheme.outline.withValues(alpha: 0.3)),
                              ),
                              child: IconButton(
                                icon: const Icon(Icons.workspace_premium_outlined, color: Color(0xFFB45309)),
                                tooltip: 'Upgrade to Premium',
                                onPressed: () => context.push('/premium'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Profile Strength Meter
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ProfileStrengthMeter(
                score: () {
                  int s = 50;
                  if (linkedin.experiences.isNotEmpty) s += 15;
                  if (linkedin.userSkills.isNotEmpty) s += 15;
                  if (linkedin.recommendations.isNotEmpty) s += 10;
                  if (linkedin.featured.isNotEmpty) s += 10;
                  return s;
                }(),
                nextStepNudge: linkedin.userSkills.isEmpty
                    ? 'Add vocational trade skills to boost discovery by 5x'
                    : (linkedin.recommendations.isEmpty
                        ? 'Request endorsements from clients & general contractors'
                        : null),
                onTap: () {
                  if (linkedin.userSkills.isEmpty) {
                    context.push('/customer/skills');
                  } else {
                    _showAddSectionSheet(context);
                  }
                },
              ),
            ),
            const SizedBox(height: 10),

            // 4. LinkedIn Analytics Card (Private to you)
            InkWell(
              onTap: () => context.push('/who-viewed-profile'),
              child: Container(
                color: Colors.white,
                padding: const EdgeInsets.all(AppTheme.spacingMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Analytics',
                          style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.midText),
                      ],
                    ),
                    Row(
                      children: [
                        Icon(Icons.visibility_outlined, size: 13, color: colorScheme.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text(
                          'Private to you • Tap to see viewers',
                          style: (theme.textTheme.labelSmall ?? const TextStyle()).copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricCol(
                            number: '${linkedin.profileViews.length * 7 + 12}',
                            label: 'Profile views',
                            subtitle: 'Past 90 days',
                          ),
                        ),
                        Container(height: 36, width: 1, color: colorScheme.outlineVariant.withValues(alpha: 0.3)),
                        Expanded(
                          child: _buildMetricCol(
                            number: '142',
                            label: 'Post impressions',
                            subtitle: 'Past 7 days',
                          ),
                        ),
                        Container(height: 36, width: 1, color: colorScheme.outlineVariant.withValues(alpha: 0.3)),
                        Expanded(
                          child: _buildMetricCol(
                            number: '84',
                            label: 'Search appearances',
                            subtitle: 'Past week',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // 5. About Section
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'About',
                        style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () => context.push('/edit-profile'),
                      ),
                    ],
                  ),
                  Text(
                    bio,
                    style: (theme.textTheme.bodyMedium ?? const TextStyle()).copyWith(
                      color: colorScheme.onSurface,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 6. Featured Section
            if (linkedin.featured.isNotEmpty)
              Container(
                color: Colors.white,
                width: double.infinity,
                padding: const EdgeInsets.all(AppTheme.spacingMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Featured',
                      style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    ...linkedin.featured.map((f) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(f.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              if (f.description != null) ...[
                                const SizedBox(height: 4),
                                Text(f.description!, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                              ],
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            const SizedBox(height: 10),

            // 7. Vocational Experience
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Experience',
                        style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 20),
                        onPressed: () => _showAddExperienceDialog(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...linkedin.experiences.map((exp) {
                    final startStr = DateFormat('MMM y').format(exp.startDate);
                    final endStr = exp.isCurrent ? 'Present' : (exp.endDate != null ? DateFormat('MMM y').format(exp.endDate!) : 'Present');
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.brandLight,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.work_outline, color: AppColors.brandDark, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(exp.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                Text('${exp.company} • ${exp.employmentType ?? "Full-time"}', style: const TextStyle(fontSize: 13, color: AppColors.darkText)),
                                Text('$startStr - $endStr', style: const TextStyle(fontSize: 11, color: AppColors.midText)),
                                if (exp.location != null)
                                  Text(exp.location!, style: const TextStyle(fontSize: 11, color: AppColors.lightText)),
                                if (exp.description != null) ...[
                                  const SizedBox(height: 4),
                                  Text(exp.description!, style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563), height: 1.3)),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 8. Education & Apprenticeships
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Education & Technical Apprenticeships',
                    style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  ...linkedin.educations.map((edu) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.brandLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.school_outlined, color: AppColors.brandDark, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(edu.school, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  if (edu.degree != null || edu.fieldOfStudy != null)
                                    Text('${edu.degree ?? ""}, ${edu.fieldOfStudy ?? ""}', style: const TextStyle(fontSize: 13, color: AppColors.darkText)),
                                  if (edu.description != null) ...[
                                    const SizedBox(height: 2),
                                    Text(edu.description!, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 9. Licenses & Trade Certifications (Accomplishments)
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Licenses & Certifications',
                    style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  ...linkedin.accomplishments.map((acc) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.card_membership_rounded, color: Color(0xFFB45309), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(acc.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  if (acc.issuer != null)
                                    Text(acc.issuer!, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                                  if (acc.credentialId != null)
                                    Text('Credential ID: ${acc.credentialId}', style: const TextStyle(fontSize: 11, color: AppColors.lightText)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 10. Skills & Endorsements Section (Interactive)
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Skills & Endorsements',
                        style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                      ),
                      TextButton(
                        onPressed: () => context.push('/customer/skills'),
                        child: const Text('Manage & Test', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: linkedin.userSkills.map((sk) {
                      return SkillChip(
                        name: sk.name,
                        endorsementsCount: sk.endorsementsCount,
                        isEndorsedByMe: sk.isEndorsedByMe,
                        isVerified: true,
                        onEndorse: () => linkedin.toggleSkillEndorsement(sk.id),
                        onTap: () => context.push('/skills/${sk.skillId}/assessment'),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 11. Recommendations Section
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recommendations (${linkedin.recommendations.length})',
                        style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                      ),
                      TextButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Recommendation request sent to recent clients!')),
                          );
                        },
                        child: const Text('Ask for recommendation', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...linkedin.recommendations.map((rec) => RecommendationCard(
                        authorName: rec.authorName,
                        authorHeadline: rec.authorHeadline,
                        authorAvatarUrl: rec.authorAvatarUrl,
                        relationship: rec.relationship,
                        text: rec.text,
                        createdAt: rec.createdAt,
                        status: rec.status,
                      )),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // 12. Worker Mode Switcher Banner
            Container(
              margin: const EdgeInsets.all(AppTheme.spacingMd),
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: colorScheme.outlineVariant.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.business_center_outlined, color: AppColors.brand, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Provide Services on VSP',
                          style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Switch to worker profile to receive quotes and job inquiries.',
                          style: (theme.textTheme.bodySmall ?? const TextStyle()).copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusFull)),
                    ),
                    onPressed: () {
                      auth.toggleUserMode();
                      context.go('/worker');
                    },
                    child: const Text('Switch', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ),

            // 13. Sign Out
            Padding(
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) {
                    context.go('/login');
                  }
                },
              ),
            ),
            const SizedBox(height: AppTheme.spacingLg),
          ],
        ),
      ),
    );
  }

  void _showAddSectionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Add Profile Section', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.work_outline, color: AppColors.brand),
                title: const Text('Add Experience'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showAddExperienceDialog(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.card_membership_outlined, color: AppColors.brand),
                title: const Text('Add License or Certification'),
                onTap: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification desk notified!')));
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAddExperienceDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final companyCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Experience'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Job Title (e.g. Master Electrician)')),
            TextField(controller: companyCtrl, decoration: const InputDecoration(labelText: 'Company / Contracting Firm')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (titleCtrl.text.isNotEmpty && companyCtrl.text.isNotEmpty) {
                context.read<LinkedInProvider>().addExperience(
                      ProfileExperience(
                        id: 'exp-${DateTime.now().millisecondsSinceEpoch}',
                        title: titleCtrl.text.trim(),
                        company: companyCtrl.text.trim(),
                        startDate: DateTime.now(),
                        isCurrent: true,
                      ),
                    );
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCol({
    required String number,
    required String label,
    required String subtitle,
  }) {
    return Column(
      children: [
        Text(
          number,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: AppColors.brand,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.darkText,
          ),
        ),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 10, color: AppColors.midText),
        ),
      ],
    );
  }
}
