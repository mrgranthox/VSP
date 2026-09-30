import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/worker_profile_model.dart';
import '../../../data/repositories/discovery_repository.dart';
import '../../widgets/article_card.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/degree_chip.dart';
import '../../widgets/premium_badge.dart';
import '../../widgets/skill_chip.dart';
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
  bool _isConnected = false;
  bool _isFollowing = false;

  late List<Map<String, dynamic>> _skills;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadWorker();
    _skills = [
      {'name': 'Solar Inverter Maintenance', 'count': 24, 'endorsed': false},
      {'name': 'Distribution Board Wiring', 'count': 38, 'endorsed': true},
      {'name': 'Fault Finding & Testing', 'count': 19, 'endorsed': false},
      {'name': '3-Phase Power Installation', 'count': 15, 'endorsed': false},
      {'name': 'Domestic Conduit Running', 'count': 29, 'endorsed': false},
    ];
  }

  void _loadWorker() {
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

  void _toggleEndorse(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      final skill = _skills[index];
      final isCurrentlyEndorsed = skill['endorsed'] as bool;
      final currentCount = skill['count'] as int;

      skill['endorsed'] = !isCurrentlyEndorsed;
      skill['count'] = isCurrentlyEndorsed ? currentCount - 1 : currentCount + 1;
    });

    final skill = _skills[index];
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        content: Text(
          (skill['endorsed'] as bool)
              ? 'Endorsed ${_worker?.displayName} for ${skill['name']}'
              : 'Endorsement removed',
        ),
      ),
    );
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
                        PremiumBadge(
                          isPremium: worker.isVerified,
                          showBadgeLabel: true,
                          child: AvatarBadge(name: worker.displayName, size: 68),
                        ),
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
                                  const DegreeChip(degree: 1),
                                  if (worker.isVerified) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.verified,
                                        size: 18, color: AppColors.brand),
                                  ],
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
                              Row(
                                children: [
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
                                  const SizedBox(width: 8),
                                  InkWell(
                                    onTap: () {
                                      setState(() => _isFollowing = !_isFollowing);
                                    },
                                    child: Text(
                                      _isFollowing ? 'Following' : '+ Follow',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: _isFollowing
                                            ? AppColors.midText
                                            : AppColors.brand,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Connect Action Bar (LinkedIn Style)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    child: Row(
                      children: [
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: _isConnected ? AppColors.midText : AppColors.brand,
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            minimumSize: const Size(90, 34),
                          ),
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            setState(() => _isConnected = !_isConnected);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                duration: const Duration(seconds: 1),
                                content: Text(_isConnected
                                    ? 'Connected with ${worker.displayName}'
                                    : 'Connection removed'),
                              ),
                            );
                          },
                          icon: Icon(
                            _isConnected ? Icons.check : Icons.person_add_outlined,
                            size: 16,
                            color: _isConnected ? AppColors.midText : AppColors.brand,
                          ),
                          label: Text(
                            _isConnected ? 'Connected' : 'Connect',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _isConnected ? AppColors.midText : AppColors.brand,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.border, width: 1.2),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            minimumSize: const Size(90, 34),
                          ),
                          onPressed: () => context.push('/skills/assessment'),
                          icon: const Icon(Icons.verified_outlined, size: 16, color: AppColors.darkText),
                          label: const Text(
                            'Assess Skills',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.darkText,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Stats Row Card
                  Container(
                    margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.screenBg,
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStat('Rating', '${worker.avgRating}', '${worker.totalReviews} reviews'),
                        _buildVerticalDivider(),
                        _buildStat('Experience', '${worker.experienceYears} Years', 'Professional'),
                        _buildVerticalDivider(),
                        _buildStat('Jobs Done', '${worker.jobsCompleted}', '100% Verified'),
                      ],
                    ),
                  ),

                  // Profile Detail Tabs (5 LinkedIn Parity Tabs)
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
                      Tab(text: 'Articles'),
                      Tab(text: 'Reviews'),
                    ],
                  ),

                  // Tab Views Content Container
                  SizedBox(
                    height: 480,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // 1. About Tab with Skill Endorsements
                        ListView(
                          padding: const EdgeInsets.all(20),
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
                            const SizedBox(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Skills & Endorsements',
                                    style: TextStyle(
                                        fontSize: 15, fontWeight: FontWeight.w800)),
                                InkWell(
                                  onTap: () => context.push('/customer/skills'),
                                  child: const Text('View All',
                                      style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.brand)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _skills.asMap().entries.map((entry) {
                                final idx = entry.key;
                                final s = entry.value;
                                return SkillChip(
                                  name: s['name'] as String,
                                  endorsementsCount: s['count'] as int,
                                  isEndorsedByMe: s['endorsed'] as bool,
                                  isVerified: true,
                                  onEndorse: () => _toggleEndorse(idx),
                                );
                              }).toList(),
                            ),
                          ],
                        ),

                        // 2. Services Tab
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

                        // 3. Portfolio Tab (Featured Trade Gallery)
                        GridView.count(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          padding: const EdgeInsets.all(16),
                          children: [
                            _buildPortfolioCard(
                              title: 'Solar Inverter Setup',
                              category: 'Residential',
                              year: '2024',
                            ),
                            _buildPortfolioCard(
                              title: 'Distribution Board Rebuild',
                              category: 'Commercial',
                              year: '2024',
                            ),
                            _buildPortfolioCard(
                              title: 'Emergency Generator Interlock',
                              category: 'Industrial',
                              year: '2023',
                            ),
                            _buildPortfolioCard(
                              title: 'Architectural LED Fixtures',
                              category: 'Domestic',
                              year: '2023',
                            ),
                          ],
                        ),

                        // 4. Articles Tab (Trade Knowledge & Articles)
                        ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          children: [
                            ArticleCard(
                              id: 'art-1',
                              title: 'Proper Surge Protection for Inverter Installations in Ghana',
                              slug: 'surge-protection-inverter-ghana',
                              subtitle: 'How to safeguard lithium battery banks from voltage spikes during grid fluctuations.',
                              authorName: worker.displayName,
                              authorHeadline: worker.headline ?? worker.primaryTrade,
                              readingTimeMinutes: 5,
                              reactionsCount: 42,
                              commentsCount: 9,
                            ),
                            ArticleCard(
                              id: 'art-2',
                              title: '5 Signs Your Home Circuit Breaker Needs Urgent Replacement',
                              slug: '5-signs-circuit-breaker-replacement',
                              subtitle: 'Frequent trips, burning odors, and heat discoloration guide for homeowners.',
                              authorName: worker.displayName,
                              authorHeadline: worker.headline ?? worker.primaryTrade,
                              readingTimeMinutes: 3,
                              reactionsCount: 28,
                              commentsCount: 4,
                            ),
                          ],
                        ),

                        // 5. Reviews Tab
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

  Widget _buildPortfolioCard({
    required String title,
    required String category,
    required String year,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 3, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.vertical(top: Radius.circular(11)),
                gradient: LinearGradient(
                  colors: [Color(0xFFE0F2FE), Color(0xFFEDE9FE)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Center(
                child: Icon(Icons.engineering_outlined, size: 36, color: AppColors.brand),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(category, style: const TextStyle(fontSize: 10, color: AppColors.midText)),
                    Text(year, style: const TextStyle(fontSize: 10, color: AppColors.lightText)),
                  ],
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
