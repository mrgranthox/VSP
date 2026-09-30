import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/booking_model.dart';
import '../../../data/models/trade_category_model.dart';
import '../../../data/models/worker_profile_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/feed_provider.dart';
import '../../providers/home_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/booking_card.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/linkedin_app_bar.dart';
import '../../widgets/linkedin_post_creator.dart';
import '../../widgets/post_card.dart';
import '../../widgets/skeleton_loader.dart';
import '../../widgets/worker_card.dart';

/// LinkedIn-style Home Feed Screen:
/// - Universal LinkedIn top app bar
/// - "Start a post" creation header with media triggers
/// - Trade/industry taxonomy carousel
/// - Professional community feed stream with LinkedIn post cards
/// - Verified trades & specialists discovery
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: const LinkedInAppBar(),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            context.read<HomeProvider>().loadHomeData(),
            context.read<FeedProvider>().loadFeed(),
          ]);
        },
        color: theme.colorScheme.primary,
        child: const CustomScrollView(
          physics: AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          slivers: [
            // 1. LinkedIn "Start a Post" Header Card
            SliverToBoxAdapter(child: _LinkedInStartPostHeader()),

            // 2. Active Upcoming Booking / Contract (if present)
            SliverToBoxAdapter(child: _ActiveBookingSection()),

            // 3. Trade Industry Topics Carousel
            SliverToBoxAdapter(child: _TradeCategoriesCarousel()),

            // 4. Community Feed Section (LinkedIn Posts Stream)
            _LinkedInFeedSliver(),

            // 5. Featured Workers Section Header
            SliverToBoxAdapter(child: _FeaturedWorkersHeader()),

            // 6. Verified Trades List
            _FeaturedWorkersSliver(),

            // Bottom padding
            SliverToBoxAdapter(
              child: SizedBox(height: AppTheme.spacingXl),
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// SUB-WIDGETS (LinkedIn Anatomy)
// -----------------------------------------------------------------------------

/// The iconic LinkedIn "Start a post" header box with quick media triggers
class _LinkedInStartPostHeader extends StatelessWidget {
  const _LinkedInStartPostHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final auth = context.watch<AuthProvider>();
    final userName = auth.currentUser?.profile?.fullName ?? 'User';

    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXs),
      color: theme.cardTheme.color ?? Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        children: [
          Row(
            children: [
              AvatarBadge(name: userName, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      LinkedInPostCreatorSheet.show(context);
                    },
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    child: Ink(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainer,
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Text(
                        'Start a post, project, or tip...',
                        style: (theme.textTheme.bodyMedium ?? const TextStyle())
                            .copyWith(
                          color: colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 6),
          // LinkedIn Quick Media Actions Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildPostAction(
                icon: Icons.image_outlined,
                label: 'Media',
                color: AppColors.info,
                onTap: () => LinkedInPostCreatorSheet.show(context),
              ),
              _buildPostAction(
                icon: Icons.smart_display_outlined,
                label: 'Video',
                color: AppColors.success,
                onTap: () => LinkedInPostCreatorSheet.show(context),
              ),
              _buildPostAction(
                icon: Icons.work_outline_rounded,
                label: 'Job',
                color: AppColors.secondary,
                onTap: () => context.push('/customer/create-request'),
              ),
              _buildPostAction(
                icon: Icons.article_outlined,
                label: 'Article',
                color: AppColors.accent,
                onTap: () => LinkedInPostCreatorSheet.show(context),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPostAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.midText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Community Posts Stream (LinkedIn Post Cards)
class _LinkedInFeedSliver extends StatelessWidget {
  const _LinkedInFeedSliver();

  @override
  Widget build(BuildContext context) {
    final feed = context.watch<FeedProvider>();

    if (feed.isLoading) {
      return SliverToBoxAdapter(
        child: ShimmerLoading(
          child: Column(
            children: const [
              WorkerCardSkeleton(),
              WorkerCardSkeleton(),
            ],
          ),
        ),
      );
    }

    if (feed.posts.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverList.builder(
      itemCount: feed.posts.length,
      itemBuilder: (context, index) {
        final post = feed.posts[index];
        return PostCard(
          post: post,
          onLikeTap: () => feed.toggleLike(post.id),
          onTap: () => context.push('/customer/feed/${post.id}'),
          onCommentTap: () => context.push('/customer/feed/${post.id}'),
          onShareTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Post reposted to your network!')),
            );
          },
          onSendTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Sent via Direct Message')),
            );
          },
        );
      },
    );
  }
}

/// Active booking banner if present
class _ActiveBookingSection extends StatelessWidget {
  const _ActiveBookingSection();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Selector<HomeProvider, Booking?>(
      selector: (_, home) => home.activeBooking,
      builder: (context, activeBooking, _) {
        if (activeBooking == null) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.only(bottom: AppTheme.spacingXs),
          color: theme.cardTheme.color ?? Colors.white,
          padding: const EdgeInsets.all(AppTheme.spacingMd),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Active Contract',
                    style: (theme.textTheme.titleSmall ?? const TextStyle())
                        .copyWith(fontWeight: FontWeight.w800),
                  ),
                  InkWell(
                    onTap: () => context.push('/bookings'),
                    child: Text(
                      'View All',
                      style: (theme.textTheme.labelMedium ?? const TextStyle())
                          .copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              BookingCard(
                booking: activeBooking,
                onTap: () => context.push('/booking/${activeBooking.id}'),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Trade Categories / Topics Carousel
class _TradeCategoriesCarousel extends StatelessWidget {
  const _TradeCategoriesCarousel();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      color: theme.cardTheme.color ?? Colors.white,
      margin: const EdgeInsets.only(bottom: AppTheme.spacingXs),
      padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingSm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Explore Industry Topics',
                  style: (theme.textTheme.titleSmall ?? const TextStyle())
                      .copyWith(fontWeight: FontWeight.w800),
                ),
                InkWell(
                  onTap: () => context.push('/customer/search'),
                  child: Text(
                    'See All',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 38,
            child: Selector<HomeProvider, List<TradeCategory>>(
              selector: (_, home) => home.tradeCategories,
              builder: (context, categories, _) {
                return ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(category.name),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                        backgroundColor: colorScheme.surfaceContainer,
                        side: BorderSide(
                          color: colorScheme.outline.withValues(alpha: 0.2),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusFull),
                        ),
                        onPressed: () {
                          HapticFeedback.selectionClick();
                          context.push(
                            '/customer/search?categoryId=${category.id}',
                          );
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Header for the featured workers section
class _FeaturedWorkersHeader extends StatelessWidget {
  const _FeaturedWorkersHeader();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Recommended Specialists For You',
            style: (theme.textTheme.titleSmall ?? const TextStyle()).copyWith(
              fontWeight: FontWeight.w800,
              color: colorScheme.onSurface,
            ),
          ),
          InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              context.go('/customer/network');
            },
            child: Text(
              'See All',
              style: (theme.textTheme.labelMedium ?? const TextStyle()).copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Sliver displaying featured workers, shimmer skeleton, or empty state
class _FeaturedWorkersSliver extends StatelessWidget {
  const _FeaturedWorkersSliver();

  @override
  Widget build(BuildContext context) {
    return Selector<HomeProvider, (bool, List<WorkerProfile>)>(
      selector: (_, home) => (home.isLoading, home.featuredWorkers),
      builder: (context, data, _) {
        final (isLoading, workers) = data;

        if (isLoading) {
          return SliverToBoxAdapter(
            child: ShimmerLoading(
              child: Column(
                children: const [
                  WorkerCardSkeleton(),
                  WorkerCardSkeleton(),
                ],
              ),
            ),
          );
        }

        if (workers.isEmpty) {
          return SliverToBoxAdapter(
            child: EmptyStateView(
              icon: Icons.engineering_outlined,
              title: 'No Specialists Found',
              subtitle: 'Post a job request to invite qualified workers.',
              buttonText: 'Post a Job',
              onButtonPressed: () => context.push('/create-request'),
            ),
          );
        }

        return SliverList.builder(
          itemCount: workers.length,
          itemBuilder: (context, index) {
            final worker = workers[index];
            return WorkerCard(
              worker: worker,
              onTap: () => context.push('/worker/${worker.id}'),
              onBookTap: () => context.push('/book-worker/${worker.id}'),
              onMessageTap: () => context.push('/chat/${worker.id}'),
            );
          },
        );
      },
    );
  }
}
