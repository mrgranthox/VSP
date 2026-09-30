import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/home_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/degree_chip.dart';
import '../../widgets/linkedin_app_bar.dart';
import '../../widgets/premium_badge.dart';

/// LinkedIn-style "My Network" Screen for VSP:
/// - Stats ribbon (Connections, Followers, Following)
/// - Invitations / Connection requests with optimistic Accept/Ignore
/// - "Trades & Specialists You May Know" with DegreeChip, PremiumBadge & Connect actions
class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});

  @override
  State<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends State<NetworkScreen> {
  final List<Map<String, String>> _invitations = [
    {
      'id': 'inv-1',
      'name': 'Emmanuel Osei',
      'headline': 'Solar Inverter & Wiring Technician',
      'timeAgo': '1d ago',
      'mutual': '12 mutual connections',
    },
    {
      'id': 'inv-2',
      'name': 'Akua Mensah',
      'headline': 'Certified Plumbing Contractor',
      'timeAgo': '2d ago',
      'mutual': '5 mutual connections',
    },
    {
      'id': 'inv-3',
      'name': 'Kofi Boateng',
      'headline': 'Master Carpenter & Joiner',
      'timeAgo': '3d ago',
      'mutual': '9 mutual connections',
    },
  ];

  final Set<String> _pendingConnectionWorkerIds = {};
  final Set<String> _followingWorkerIds = {};
  int _connectionCount = 142;

  void _acceptInvitation(Map<String, String> inv) {
    HapticFeedback.lightImpact();
    setState(() {
      _invitations.removeWhere((i) => i['id'] == inv['id']);
      _connectionCount++;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.brand,
        behavior: SnackBarBehavior.floating,
        content: Text('Connected with ${inv['name']}!'),
      ),
    );
  }

  void _ignoreInvitation(Map<String, String> inv) {
    HapticFeedback.lightImpact();
    setState(() {
      _invitations.removeWhere((i) => i['id'] == inv['id']);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        content: Text('Ignored invitation from ${inv['name']}'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final home = context.watch<HomeProvider>();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const LinkedInAppBar(hintText: 'Search network & trades...'),
      body: RefreshIndicator(
        onRefresh: () => home.loadHomeData(),
        child: ListView(
          padding: const EdgeInsets.only(bottom: AppTheme.spacingXl),
          children: [
            // 1. Manage My Network Bar
            Container(
              color: theme.cardTheme.color ?? Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: AppTheme.spacingMd,
                vertical: AppTheme.spacingSm + 2,
              ),
              child: InkWell(
                onTap: () => context.push('/customer/followers'),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Manage my network',
                      style: (theme.textTheme.titleSmall ?? const TextStyle())
                          .copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          '$_connectionCount connections',
                          style: (theme.textTheme.bodySmall ?? const TextStyle())
                              .copyWith(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 20,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 1),

            // 1b. Network Stats Ribbon
            Container(
              color: theme.cardTheme.color ?? Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatRibbonItem(
                    label: 'Connections',
                    count: '$_connectionCount',
                    onTap: () => context.push('/customer/followers'),
                  ),
                  _buildRibbonDivider(),
                  _buildStatRibbonItem(
                    label: 'Followers',
                    count: '284',
                    onTap: () => context.push('/customer/followers'),
                  ),
                  _buildRibbonDivider(),
                  _buildStatRibbonItem(
                    label: 'Following',
                    count: '118',
                    onTap: () => context.push('/customer/followers'),
                  ),
                  _buildRibbonDivider(),
                  _buildStatRibbonItem(
                    label: 'Pages & Groups',
                    count: '17',
                    onTap: () => context.push('/customer/followers'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.spacingXs),

            // 2. Invitations / Pending Requests Card
            if (_invitations.isNotEmpty) ...[
              Container(
                color: theme.cardTheme.color ?? Colors.white,
                padding: const EdgeInsets.all(AppTheme.spacingMd),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Invitations (${_invitations.length})',
                          style: (theme.textTheme.titleSmall ?? const TextStyle())
                              .copyWith(fontWeight: FontWeight.w800),
                        ),
                        InkWell(
                          onTap: () => context.push('/customer/followers'),
                          child: Text(
                            'See all',
                            style: (theme.textTheme.labelMedium ?? const TextStyle())
                                .copyWith(
                              fontWeight: FontWeight.w700,
                              color: colorScheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.spacingSm),
                    ..._invitations.asMap().entries.map((entry) {
                      final index = entry.key;
                      final inv = entry.value;
                      return Column(
                        children: [
                          if (index > 0) const Divider(height: 16),
                          _InvitationItem(
                            name: inv['name']!,
                            headline: inv['headline']!,
                            timeAgo: inv['timeAgo']!,
                            mutual: inv['mutual']!,
                            onAccept: () => _acceptInvitation(inv),
                            onIgnore: () => _ignoreInvitation(inv),
                          ),
                        ],
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: AppTheme.spacingXs),
            ],

            // 3. Recommended Trades & Specialists You May Know (PYMK)
            Container(
              color: theme.cardTheme.color ?? Colors.white,
              padding: const EdgeInsets.all(AppTheme.spacingMd),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Trades & Specialists You May Know',
                        style: (theme.textTheme.titleSmall ?? const TextStyle())
                            .copyWith(fontWeight: FontWeight.w800),
                      ),
                      const DegreeChip(degree: 2),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Based on your trade network and recent service searches',
                    style: (theme.textTheme.bodySmall ?? const TextStyle())
                        .copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: AppTheme.spacingMd),

                  // Workers List
                  ...home.featuredWorkers.map((worker) {
                    final isPending =
                        _pendingConnectionWorkerIds.contains(worker.id);
                    final isFollowing =
                        _followingWorkerIds.contains(worker.id);

                    return _NetworkWorkerCard(
                      workerId: worker.id,
                      name: worker.displayName,
                      trade: worker.primaryTrade,
                      experience: '${worker.experienceYears} yrs experience',
                      rating: '${worker.ratingAvg}',
                      reviews: '${worker.reviewCount}',
                      isVerified: worker.isVerified,
                      isPending: isPending,
                      isFollowing: isFollowing,
                      onConnect: () {
                        HapticFeedback.lightImpact();
                        setState(() {
                          if (isPending) {
                            _pendingConnectionWorkerIds.remove(worker.id);
                          } else {
                            _pendingConnectionWorkerIds.add(worker.id);
                          }
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            duration: const Duration(seconds: 1),
                            content: Text(
                              isPending
                                  ? 'Invitation withdrawn'
                                  : 'Invitation sent to ${worker.displayName}',
                            ),
                          ),
                        );
                      },
                      onFollow: () {
                        HapticFeedback.lightImpact();
                        setState(() {
                          if (isFollowing) {
                            _followingWorkerIds.remove(worker.id);
                          } else {
                            _followingWorkerIds.add(worker.id);
                          }
                        });
                      },
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRibbonItem({
    required String label,
    required String count,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          children: [
            Text(
              count,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppColors.darkText,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.midText,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRibbonDivider() {
    return Container(
      height: 24,
      width: 1,
      color: AppColors.border,
    );
  }
}

class _InvitationItem extends StatelessWidget {
  final String name;
  final String headline;
  final String timeAgo;
  final String mutual;
  final VoidCallback onAccept;
  final VoidCallback onIgnore;

  const _InvitationItem({
    required this.name,
    required this.headline,
    required this.timeAgo,
    required this.mutual,
    required this.onAccept,
    required this.onIgnore,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Row(
      children: [
        PremiumBadge(
          isPremium: true,
          showBadgeLabel: false,
          child: AvatarBadge(name: name, size: 48),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: (theme.textTheme.titleSmall ?? const TextStyle())
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const DegreeChip(degree: 2),
                ],
              ),
              Text(
                headline,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: (theme.textTheme.bodySmall ?? const TextStyle()).copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$mutual • $timeAgo',
                style: (theme.textTheme.labelSmall ?? const TextStyle()).copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Ignore',
          icon: const Icon(Icons.close_rounded, size: 20),
          onPressed: onIgnore,
        ),
        IconButton(
          tooltip: 'Accept',
          icon: Icon(
            Icons.check_circle_outline_rounded,
            size: 24,
            color: colorScheme.primary,
          ),
          onPressed: onAccept,
        ),
      ],
    );
  }
}

class _NetworkWorkerCard extends StatelessWidget {
  final String workerId;
  final String name;
  final String trade;
  final String experience;
  final String rating;
  final String reviews;
  final bool isVerified;
  final bool isPending;
  final bool isFollowing;
  final VoidCallback onConnect;
  final VoidCallback onFollow;

  const _NetworkWorkerCard({
    required this.workerId,
    required this.name,
    required this.trade,
    required this.experience,
    required this.rating,
    required this.reviews,
    required this.isVerified,
    required this.isPending,
    required this.isFollowing,
    required this.onConnect,
    required this.onFollow,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingMd),
      padding: const EdgeInsets.all(AppTheme.spacingSm + 2),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => context.push('/worker/$workerId'),
            child: PremiumBadge(
              isPremium: isVerified,
              showBadgeLabel: isVerified,
              child: AvatarBadge(name: name, size: 48),
            ),
          ),
          const SizedBox(width: AppTheme.spacingSm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: InkWell(
                        onTap: () => context.push('/worker/$workerId'),
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: (theme.textTheme.titleSmall ?? const TextStyle())
                              .copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const DegreeChip(degree: 2),
                  ],
                ),
                Text(
                  trade,
                  style: (theme.textTheme.bodySmall ?? const TextStyle()).copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$experience • $rating ★ ($reviews reviews)',
                  style: (theme.textTheme.labelSmall ?? const TextStyle()).copyWith(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: AppTheme.spacingXs + 2),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isPending ? AppColors.midText : colorScheme.primary,
                          width: 1.5,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        minimumSize: const Size(80, 32),
                      ),
                      onPressed: onConnect,
                      icon: Icon(
                        isPending ? Icons.done : Icons.person_add_outlined,
                        size: 14,
                        color: isPending ? AppColors.midText : colorScheme.primary,
                      ),
                      label: Text(
                        isPending ? 'Pending' : 'Connect',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isPending ? AppColors.midText : colorScheme.primary,
                        ),
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: const Size(60, 32),
                      ),
                      onPressed: onFollow,
                      child: Text(
                        isFollowing ? 'Following' : '+ Follow',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isFollowing
                              ? colorScheme.primary
                              : colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                      tooltip: 'Message',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      onPressed: () => context.push('/chat/$workerId'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
