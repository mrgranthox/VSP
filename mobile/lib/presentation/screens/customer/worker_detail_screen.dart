import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/worker_profile_model.dart';
import '../../../data/repositories/discovery_repository.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/vsp_button.dart';

class WorkerDetailScreen extends StatefulWidget {
  final String workerId;

  const WorkerDetailScreen({super.key, required this.workerId});

  @override
  State<WorkerDetailScreen> createState() => _WorkerDetailScreenState();
}

class _WorkerDetailScreenState extends State<WorkerDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  WorkerProfile? _worker;
  bool _isSaved = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadWorker();
  }

  void _loadWorker() {
    // Find matching fixture or default
    final list = DiscoveryRepository.fallbackFeaturedWorkers;
    final found = list.where((w) => w.id == widget.workerId);
    setState(() {
      _worker = found.isNotEmpty ? found.first : list.first;
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_worker == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final worker = _worker!;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
              color: _isSaved ? AppColors.brand : AppColors.dark2,
            ),
            onPressed: () {
              setState(() {
                _isSaved = !_isSaved;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isSaved
                      ? 'Worker saved to bookmarks'
                      : 'Removed from bookmarks'),
                  duration: const Duration(seconds: 1),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Profile Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AvatarBadge(name: worker.displayName, size: 68),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      worker.displayName,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.darkText,
                                      ),
                                    ),
                                  ),
                                  if (worker.isVerified)
                                    const Icon(Icons.verified,
                                        size: 18, color: AppColors.brand),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                worker.headline ?? worker.primaryTrade,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.midText,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.brandLight,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  '${worker.primaryTradeIcon} ${worker.primaryTrade}',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.brandDark,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Stats Row Card
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.screenBg,
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStat('Rating', '${worker.avgRating} ⭐', '${worker.totalReviews} reviews'),
                        _buildVerticalDivider(),
                        _buildStat('Experience', '${worker.experienceYears} Years', 'Professional'),
                        _buildVerticalDivider(),
                        _buildStat('Jobs Done', '${worker.jobsCompleted}', '100% Verified'),
                      ],
                    ),
                  ),

                  // Profile Detail Tabs
                  TabBar(
                    controller: _tabController,
                    indicatorColor: AppColors.brand,
                    labelColor: AppColors.brand,
                    unselectedLabelColor: AppColors.midText,
                    labelStyle: const TextStyle(
                      fontFamily: 'Nunito',
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontFamily: 'Nunito',
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    tabs: const [
                      Tab(text: 'About'),
                      Tab(text: 'Services'),
                      Tab(text: 'Portfolio'),
                      Tab(text: 'Reviews'),
                    ],
                  ),

                  // Tab Views Content Container
                  SizedBox(
                    height: 380,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // About Tab
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Professional Bio',
                                  style: TextStyle(
                                      fontSize: 15, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 8),
                              Text(
                                worker.bio ??
                                    'Licensed tradesperson with extensive experience in domestic and commercial electrical maintenance.',
                                style: const TextStyle(
                                    fontSize: 14, color: AppColors.dark3, height: 1.6),
                              ),
                              const SizedBox(height: 20),
                              const Text('Service Areas Covered',
                                  style: TextStyle(
                                      fontSize: 15, fontWeight: FontWeight.w800)),
                              const SizedBox(height: 8),
                              const Row(
                                children: [
                                  Icon(Icons.location_on_outlined,
                                      size: 16, color: AppColors.brand),
                                  SizedBox(width: 6),
                                  Text('Greater Accra (25km coverage radius)',
                                      style: TextStyle(
                                          fontSize: 13, fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Services Tab
                        ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildServiceItem('Diagnostic Inspection & Troubleshooting',
                                'Thorough testing of distribution panels and wiring.', 120.0),
                            _buildServiceItem('General Repair & Fixture Installation',
                                'Replacing breakers, switches, lighting sockets, or appliances.', 150.0),
                            _buildServiceItem('Complete Wiring / Rewiring Project',
                                'Full premise inspection, conduit running, and test certification.', 450.0),
                          ],
                        ),

                        // Portfolio Tab
                        GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          padding: const EdgeInsets.all(16),
                          children: List.generate(4, (index) {
                            return Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFE2E8F0),
                                borderRadius: BorderRadius.circular(12),
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFE0F2FE), Color(0xFFEDE9FE)],
                                ),
                              ),
                              child: const Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.photo_outlined,
                                        size: 32, color: AppColors.lightText),
                                    SizedBox(height: 4),
                                    Text('Project Photo',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.midText,
                                            fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            );
                          }),
                        ),

                        // Reviews Tab
                        ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildReviewItem(
                                'Kwame Asante', 5.0, '2 days ago', 'Super fast and clean installation! He fixed our distribution board in under 2 hours.'),
                            _buildReviewItem(
                                'Esi Nyarko', 4.8, '1 week ago', 'Very polite professional. Reasonable pricing and explained everything he was doing.'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Sticky Bottom CTA Bar
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 1,
                  child: VspButton(
                    text: 'Message',
                    variant: VspButtonVariant.outline,
                    onPressed: () => context.push('/chat/${worker.id}'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: VspButton(
                    text: 'Book This Worker',
                    onPressed: () => context.push('/book-worker/${worker.id}'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value, String sub) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: AppColors.darkText,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.midText),
        ),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(width: 1, height: 28, color: AppColors.border);
  }

  Widget _buildServiceItem(String title, String desc, double price) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.screenBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(desc,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.midText)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'GHS ${price.toStringAsFixed(0)}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppColors.brand,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewItem(String name, double rating, String date, String comment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.screenBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700)),
              Row(
                children: [
                  const Icon(Icons.star, size: 14, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 2),
                  Text(rating.toStringAsFixed(1),
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(date,
              style: const TextStyle(fontSize: 11, color: AppColors.lightText)),
          const SizedBox(height: 6),
          Text(comment,
              style: const TextStyle(fontSize: 12, color: AppColors.dark3, height: 1.4)),
        ],
      ),
    );
  }
}
