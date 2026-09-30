import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/presentation/providers/auth_provider.dart';
import 'package:vsp_mobile/presentation/providers/worker_provider.dart';
import 'package:vsp_mobile/presentation/widgets/avatar_badge.dart';

class WorkerProfilePreviewScreen extends StatelessWidget {
  const WorkerProfilePreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final workerProvider = context.watch<WorkerProvider>();

    final user = authProvider.currentUser;
    final worker = workerProvider.profile;
    final fullName = user?.profile?.fullName ?? 'Worker Profile';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Public Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note_rounded),
            tooltip: 'Edit Profile Info',
            onPressed: () => context.push('/worker/onboarding'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/customer/settings'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Preview Notice Bar
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppColors.secondarySurface,
              child: const Row(
                children: [
                  Icon(Icons.visibility_outlined,
                      size: 16, color: AppColors.secondary),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Preview Mode: This is how potential clients view your profile on VSP.',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.secondaryDark,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),

            // Profile Header
            Container(
              padding: const EdgeInsets.all(20),
              color: Colors.white,
              child: Column(
                children: [
                  AvatarBadge(
                    name: fullName,
                    imageUrl: user?.profile?.avatarUrl,
                    radius: 44,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        fullName,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.verified_rounded,
                          color: AppColors.primary, size: 20),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    worker?.headline ?? 'Licensed Master Electrician',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Quick Stats Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildHeaderStat(
                        '${worker?.ratingAvg ?? 4.9} ★',
                        '${worker?.reviewCount ?? 26} Reviews',
                      ),
                      Container(
                          height: 24, width: 1, color: Colors.grey.shade300),
                      _buildHeaderStat(
                        '${worker?.experienceYears ?? 5} Yrs',
                        'Experience',
                      ),
                      Container(
                          height: 24, width: 1, color: Colors.grey.shade300),
                      _buildHeaderStat(
                        'GH₵ ${(worker?.hourlyRateMinor ?? 15000) ~/ 100}/hr',
                        'Base Rate',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Bio Section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'About Me',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    worker?.bio ??
                        'Providing certified, reliable vocational trade services across Greater Accra. Available for both residential emergency repairs and commercial contracts.',
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.45),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            // Profile Actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    tileColor: Colors.white,
                    leading: const Icon(Icons.star_rate_rounded,
                        color: AppColors.warning),
                    title: const Text('My Client Reviews',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Read customer ratings & feedback',
                        style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push('/worker/reviews'),
                  ),
                  const SizedBox(height: 10),
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    tileColor: Colors.white,
                    leading: const Icon(Icons.payments_outlined,
                        color: AppColors.primary),
                    title: const Text('Earnings & Analytics',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Manage payouts and view job metrics',
                        style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push('/worker/analytics'),
                  ),
                  const SizedBox(height: 10),
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    tileColor: Colors.white,
                    leading: const Icon(Icons.swap_horiz_rounded,
                        color: AppColors.secondary),
                    title: const Text('Switch to Customer Mode',
                        style: TextStyle(
                            fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Browse services as a client',
                        style: TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      authProvider.setUserMode('customer');
                      context.go('/customer/home');
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}
