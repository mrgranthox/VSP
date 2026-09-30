import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/linkedin_provider.dart';
import '../../providers/search_provider.dart';
import '../../widgets/company_card.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/group_card.dart';
import '../../widgets/hashtag_chip.dart';
import '../../widgets/worker_card.dart';

class SearchScreen extends StatefulWidget {
  final String? initialCategoryId;

  const SearchScreen({super.key, this.initialCategoryId});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String _selectedScope = 'ALL'; // 'ALL', 'PEOPLE', 'JOBS', 'COMPANIES', 'GUILDS', 'HASHTAGS'
  final List<String> _recentSearches = [
    'Commercial Electrician 480V',
    'Certified 6G Welder',
    'HVAC Chiller Specialist',
    'Solar Inverter Commissioning',
    'Master Plumber Austin TX',
  ];

  final List<Map<String, dynamic>> _trendingHashtags = [
    {'tag': 'ElectricianLife', 'count': 4280},
    {'tag': 'NEC2024', 'count': 3120},
    {'tag': 'PipeWelder', 'count': 2890},
    {'tag': 'HVACTech', 'count': 2450},
    {'tag': 'SolarEnergy', 'count': 1980},
    {'tag': 'SkilledTrades', 'count': 5600},
  ];

  void _showFilterModal(BuildContext context) {
    final search = context.read<SearchProvider>();
    double tempRadius = search.radiusKm;
    double tempRating = search.minRating;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXl)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filter Workers',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Maximum Distance',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                      Text(
                        '${tempRadius.toInt()} km',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.brand,
                        ),
                      ),
                    ],
                  ),
                  Slider(
                    value: tempRadius,
                    min: 1,
                    max: 50,
                    activeColor: AppColors.brand,
                    inactiveColor: AppColors.border,
                    onChanged: (val) {
                      setModalState(() {
                        tempRadius = val;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Minimum Rating',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(5, (index) {
                      final star = index + 1.0;
                      final isSelected = tempRating >= star;
                      return InkWell(
                        onTap: () {
                          setModalState(() {
                            tempRating = tempRating == star ? 0.0 : star;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.brandLight : AppColors.screenBg,
                            borderRadius: BorderRadius.circular(AppTheme.radius),
                            border: Border.all(
                              color: isSelected ? AppColors.brand : AppColors.border,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.star_rounded,
                                size: 16,
                                color: isSelected ? AppColors.brand : AppColors.midText,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${star.toInt()}+',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? AppColors.brand : AppColors.midText,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.brand,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.radius),
                        ),
                      ),
                      onPressed: () {
                        search.setRadius(tempRadius);
                        search.setMinRating(tempRating);
                        Navigator.pop(ctx);
                      },
                      child: const Text(
                        'Apply Filters',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final search = context.watch<SearchProvider>();
    final linkedin = context.watch<LinkedInProvider>();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Trades Search', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            icon: Icon(
              search.isMapView ? Icons.format_list_bulleted_rounded : Icons.map_outlined,
              color: AppColors.brand,
            ),
            tooltip: search.isMapView ? 'List View' : 'Map View',
            onPressed: () => search.toggleViewMode(),
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded, color: AppColors.dark2),
            onPressed: () => _showFilterModal(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Input Container
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (val) => search.setQuery(val),
              decoration: InputDecoration(
                hintText: 'Search people, jobs, contractors, #hashtags...',
                hintStyle: const TextStyle(fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: AppColors.lightText, size: 20),
                suffixIcon: search.query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () => search.setQuery(''),
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ),

          // Universal Scope Tabs (LinkedIn Parity)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              height: 34,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildScopePill('All', 'ALL'),
                  _buildScopePill('Tradespeople', 'PEOPLE'),
                  _buildScopePill('Jobs', 'JOBS'),
                  _buildScopePill('Companies', 'COMPANIES'),
                  _buildScopePill('Guilds', 'GUILDS'),
                  _buildScopePill('Hashtags', 'HASHTAGS'),
                ],
              ),
            ),
          ),

          // Categories horizontal strip (when All or People)
          if (_selectedScope == 'ALL' || _selectedScope == 'PEOPLE')
            Container(
              color: Colors.white,
              padding: const EdgeInsets.only(bottom: 10),
              child: SizedBox(
                height: 34,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: search.categories.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      final isAllSelected = search.selectedTradeId == null;
                      return Container(
                        margin: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          selected: isAllSelected,
                          label: const Text('All Trades'),
                          onSelected: (_) => search.selectTrade(null),
                          selectedColor: AppColors.brand,
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isAllSelected ? Colors.white : AppColors.darkText,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                          side: BorderSide.none,
                        ),
                      );
                    }
                    final cat = search.categories[index - 1];
                    final isSelected = search.selectedTradeId == cat.id;

                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        selected: isSelected,
                        label: Text('${cat.icon} ${cat.name}'),
                        onSelected: (_) => search.selectTrade(cat.id),
                        selectedColor: AppColors.brand,
                        labelStyle: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.darkText,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                        side: BorderSide.none,
                      ),
                    );
                  },
                ),
              ),
            ),

          // Content based on selected scope
          Expanded(
            child: _buildScopeContent(search, linkedin),
          ),
        ],
      ),
    );
  }

  Widget _buildScopePill(String label, String scopeKey) {
    final isSelected = _selectedScope == scopeKey;
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: AppColors.brand,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
          color: isSelected ? Colors.white : AppColors.darkText,
        ),
        backgroundColor: const Color(0xFFF3F4F6),
        onSelected: (_) => setState(() => _selectedScope = scopeKey),
      ),
    );
  }

  Widget _buildScopeContent(SearchProvider search, LinkedInProvider linkedin) {
    // If query is empty and ALL scope, show Recent Searches & Trending Hashtags
    if (search.query.isEmpty && _selectedScope == 'ALL') {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Recent Searches', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              TextButton(
                onPressed: () => setState(() => _recentSearches.clear()),
                child: const Text('Clear all', style: TextStyle(fontSize: 12, color: AppColors.midText)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _recentSearches.map((s) {
              return ActionChip(
                avatar: const Icon(Icons.history, size: 14, color: AppColors.midText),
                label: Text(s, style: const TextStyle(fontSize: 12)),
                onPressed: () => search.setQuery(s),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Trending Trade Topics', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _trendingHashtags.map((h) {
              return HashtagChip(
                tag: h['tag'] as String,
                postCount: h['count'] as int,
                onTap: () => context.push('/hashtags/${h['tag']}'),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Recommended Companies to Follow', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          const SizedBox(height: 10),
          ...linkedin.companies.take(2).map((c) => CompanyCard(
                id: c.id,
                name: c.name,
                slug: c.slug,
                industry: c.industry,
                location: c.location,
                followerCount: c.followerCount,
                employeeCount: c.employeeCount,
                isFollowed: c.isFollowed,
                isVerified: c.verificationStatus == 'APPROVED',
              )),
        ],
      );
    }

    switch (_selectedScope) {
      case 'JOBS':
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.work_outline, size: 54, color: AppColors.brand),
                const SizedBox(height: 14),
                Text(
                  search.query.isNotEmpty
                      ? 'Search jobs matching "${search.query}"'
                      : 'Explore Active Vocational Openings',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Browse full-time, subcontract, and emergency on-call job openings with 1-Tap Easy Apply.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.midText, fontSize: 13),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
                  ),
                  onPressed: () => context.push('/customer/jobs'),
                  icon: const Icon(Icons.launch, size: 18),
                  label: const Text('Open Jobs Board'),
                ),
              ],
            ),
          ),
        );

      case 'COMPANIES':
        final q = search.query.toLowerCase();
        final companies = linkedin.companies.where((c) {
          if (q.isEmpty) return true;
          return c.name.toLowerCase().contains(q) || c.industry.toLowerCase().contains(q);
        }).toList();

        if (companies.isEmpty) {
          return const Center(child: Text('No companies match your search.'));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: companies.length,
          itemBuilder: (ctx, idx) {
            final c = companies[idx];
            return CompanyCard(
              id: c.id,
              name: c.name,
              slug: c.slug,
              industry: c.industry,
              location: c.location,
              followerCount: c.followerCount,
              employeeCount: c.employeeCount,
              isFollowed: c.isFollowed,
              isVerified: c.verificationStatus == 'APPROVED',
            );
          },
        );

      case 'GUILDS':
        final q = search.query.toLowerCase();
        final groups = linkedin.groups.where((g) {
          if (q.isEmpty) return true;
          final descMatch = g.description?.toLowerCase().contains(q) ?? false;
          return g.name.toLowerCase().contains(q) || descMatch;
        }).toList();

        if (groups.isEmpty) {
          return const Center(child: Text('No trade guilds match your search.'));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: groups.length,
          itemBuilder: (ctx, idx) {
            final g = groups[idx];
            return GroupCard(
              id: g.id,
              name: g.name,
              description: g.description,
              privacy: g.privacy,
              memberCount: g.memberCount,
              isMember: g.isMember,
              coverImageUrl: g.coverImageUrl,
            );
          },
        );

      case 'HASHTAGS':
        final q = search.query.replaceAll('#', '').toLowerCase();
        final filteredTags = _trendingHashtags.where((h) {
          if (q.isEmpty) return true;
          return (h['tag'] as String).toLowerCase().contains(q);
        }).toList();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Trade Hashtags', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: filteredTags.map((h) {
                return HashtagChip(
                  tag: h['tag'] as String,
                  postCount: h['count'] as int,
                  onTap: () => context.push('/hashtags/${h['tag']}'),
                );
              }).toList(),
            ),
          ],
        );

      case 'ALL':
      case 'PEOPLE':
      default:
        // Workers search results
        if (search.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (search.results.isEmpty) {
          return EmptyStateView(
            icon: Icons.search_off_rounded,
            title: 'No workers matched',
            message: 'Try expanding your radius or selecting a different trade category.',
            buttonText: 'Reset Filters',
            onButtonPressed: () {
              search.selectTrade(null);
              search.setQuery('');
              search.setRadius(25);
              search.setMinRating(0);
            },
          );
        }
        if (search.isMapView) {
          return _buildMapPlaceholder(context, search);
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 4),
          itemCount: search.results.length,
          itemBuilder: (context, index) {
            final worker = search.results[index];
            return WorkerCard(
              worker: worker,
              onTap: () => context.push('/worker/${worker.id}'),
              onBookTap: () => context.push('/book-worker/${worker.id}'),
              onMessageTap: () => context.push('/chat/${worker.id}'),
            );
          },
        );
    }
  }

  Widget _buildMapPlaceholder(BuildContext context, SearchProvider search) {
    return Stack(
      children: [
        Container(
          width: double.infinity,
          height: double.infinity,
          color: const Color(0xFFE0F2FE),
          child: Stack(
            children: [
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.map, size: 72, color: Color(0xFF93C5FD)),
                    SizedBox(height: 8),
                    Text(
                      'Live Geolocation Map: Greater Area',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E3A8A),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                top: 80,
                left: 60,
                child: _buildMapPin('BW', 'Bob W.'),
              ),
              Positioned(
                top: 140,
                right: 90,
                child: _buildMapPin('AK', 'Ama K.'),
              ),
              Positioned(
                top: 220,
                left: 140,
                child: _buildMapPin('KM', 'Kofi M.'),
              ),
            ],
          ),
        ),
        Positioned(
          bottom: 16,
          left: 0,
          right: 0,
          child: SizedBox(
            height: 180,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: search.results.length,
              itemBuilder: (context, index) {
                final worker = search.results[index];
                return Container(
                  width: 290,
                  margin: const EdgeInsets.only(right: 12),
                  child: WorkerCard(
                    worker: worker,
                    onTap: () => context.push('/worker/${worker.id}'),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMapPin(String initials, String name) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.brand,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on, size: 14, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            name,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
