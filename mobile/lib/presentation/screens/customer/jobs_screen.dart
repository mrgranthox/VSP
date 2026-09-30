import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/service_request_model.dart';
import '../../providers/service_request_provider.dart';
import '../../widgets/degree_chip.dart';
import '../../widgets/easy_apply_sheet.dart';
import '../../widgets/linkedin_app_bar.dart';

/// LinkedIn-style Jobs & Service Requests Screen with Easy Apply & Skill Match
class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  String _selectedFilter = 'All';
  final Set<String> _savedJobIds = {};

  final List<String> _filters = [
    'All',
    'Electrical',
    'Plumbing',
    'Carpentry',
    'AC & Cooling',
    'Immediate Start',
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final reqProv = context.watch<ServiceRequestProvider>();

    final filteredRequests = reqProv.requests.where((req) {
      if (_selectedFilter == 'All') return true;
      if (_selectedFilter == 'Immediate Start') {
        return req.urgency.toUpperCase() == 'EMERGENCY' ||
            req.urgency.toUpperCase() == 'HIGH';
      }
      final trade = req.tradeName?.toLowerCase() ?? '';
      final title = req.title.toLowerCase();
      final desc = req.description.toLowerCase();
      final filterLower = _selectedFilter.toLowerCase();
      return trade.contains(filterLower) ||
          title.contains(filterLower) ||
          desc.contains(filterLower);
    }).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const LinkedInAppBar(hintText: 'Search jobs, requests, skills...'),
      body: ListView(
        padding: const EdgeInsets.only(bottom: AppTheme.spacingXl),
        children: [
          // 1. My Jobs Navigation Bar (LinkedIn Tracker Pills)
          Container(
            color: theme.cardTheme.color ?? Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spacingMd,
              vertical: AppTheme.spacingSm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildTrackerItem(
                  icon: Icons.bookmark_outline_rounded,
                  label: 'My Jobs',
                  onTap: () => context.push('/customer/requests'),
                ),
                _buildTrackerItem(
                  icon: Icons.assignment_turned_in_outlined,
                  label: 'Applied',
                  onTap: () => context.push('/customer/applications'),
                ),
                _buildTrackerItem(
                  icon: Icons.track_changes_rounded,
                  label: 'Bookings',
                  onTap: () => context.push('/customer/bookings'),
                ),
                _buildTrackerItem(
                  icon: Icons.add_circle_outline_rounded,
                  label: 'Post a Job',
                  onTap: () => context.push('/customer/create-request'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTheme.spacingXs),

          // 2. Filter Pills Carousel
          Container(
            color: theme.cardTheme.color ?? Colors.white,
            padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingXs),
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingMd),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isSelected = filter == _selectedFilter;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    showCheckmark: false,
                    selectedColor: colorScheme.primaryContainer,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight:
                          isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected
                          ? colorScheme.primary
                          : colorScheme.onSurface,
                    ),
                    side: BorderSide(
                      color: isSelected
                          ? colorScheme.primary
                          : colorScheme.outline.withValues(alpha: 0.3),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                    onSelected: (val) {
                      HapticFeedback.selectionClick();
                      setState(() => _selectedFilter = filter);
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppTheme.spacingXs),

          // 3. Post a Job CTA Card (LinkedIn Hiring Banner)
          Container(
            margin: const EdgeInsets.symmetric(
              horizontal: AppTheme.spacingMd,
              vertical: AppTheme.spacingXs,
            ),
            padding: const EdgeInsets.all(AppTheme.spacingMd),
            decoration: BoxDecoration(
              color: theme.cardTheme.color ?? Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius),
              border: Border.all(
                color: colorScheme.outlineVariant.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Looking for skilled trades?',
                        style: (theme.textTheme.titleSmall ?? const TextStyle())
                            .copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Post your project request and receive direct proposals from verified workers.',
                        style: (theme.textTheme.bodySmall ?? const TextStyle())
                            .copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  onPressed: () => context.push('/customer/create-request'),
                  child: const Text('Post a Job', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),

          // 4. Recommended Jobs Section Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recommended for you',
                  style: (theme.textTheme.titleSmall ?? const TextStyle())
                      .copyWith(fontWeight: FontWeight.w800),
                ),
                Text(
                  '${filteredRequests.length} available',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),

          if (filteredRequests.isEmpty)
            Padding(
              padding: const EdgeInsets.all(AppTheme.spacingLg),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.work_off_outlined,
                      size: 48,
                      color: colorScheme.outline,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No service requests currently open in "$_selectedFilter".',
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            )
          else
            ...filteredRequests.map((req) => _buildJobCard(context, req, theme, colorScheme)),
        ],
      ),
    );
  }

  Widget _buildJobCard(
    BuildContext context,
    ServiceRequest req,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    final isSaved = _savedJobIds.contains(req.id);
    final matchScore = _getSkillMatchScore(req.title);
    final matchCount = (matchScore * 10 / 100).round();

    return Container(
      margin: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingMd,
        vertical: 4,
      ),
      padding: const EdgeInsets.all(AppTheme.spacingMd),
      decoration: BoxDecoration(
        color: theme.cardTheme.color ?? Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.brandLight,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                child: const Icon(
                  Icons.work_outline_rounded,
                  color: AppColors.brand,
                  size: 22,
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
                            req.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: (theme.textTheme.titleSmall ??
                                    const TextStyle())
                                .copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const DegreeChip(degree: 1),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${req.locationAddress} • ${req.budgetFormatted}',
                      style: (theme.textTheme.bodySmall ??
                              const TextStyle())
                          .copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: isSaved ? 'Remove from Saved' : 'Save Job',
                icon: Icon(
                  isSaved
                      ? Icons.bookmark_rounded
                      : Icons.bookmark_border_rounded,
                  color: isSaved ? AppColors.brand : colorScheme.onSurfaceVariant,
                ),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  setState(() {
                    if (isSaved) {
                      _savedJobIds.remove(req.id);
                    } else {
                      _savedJobIds.add(req.id);
                    }
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      duration: const Duration(seconds: 1),
                      content: Text(
                        isSaved ? 'Job removed from saved' : 'Job saved!',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Skill Match Percentage Chip (LinkedIn Job Match)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: const Color(0xFFA5D6A7),
                width: 0.8,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.check_circle_rounded,
                  size: 14,
                  color: Color(0xFF2E7D32),
                ),
                const SizedBox(width: 5),
                Text(
                  '$matchCount/10 skills match • $matchScore%',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1B5E20),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          Text(
            req.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: (theme.textTheme.bodySmall ?? const TextStyle())
                .copyWith(color: colorScheme.onSurface),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                ),
                child: Text(
                  req.urgency,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.primary,
                  ),
                ),
              ),
              const Spacer(),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  minimumSize: const Size(80, 32),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                ),
                icon: const Icon(Icons.bolt_rounded, size: 16),
                label: const Text(
                  'Easy Apply',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  EasyApplySheet.show(
                    context,
                    jobId: req.id,
                    jobTitle: req.title,
                    companyOrPoster: req.locationAddress,
                    budget: req.budgetFormatted,
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  int _getSkillMatchScore(String title) {
    final hash = title.hashCode.abs();
    // Return high match scores between 70% and 95%
    return 70 + (hash % 26);
  }

  Widget _buildTrackerItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppColors.brand),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.darkText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
