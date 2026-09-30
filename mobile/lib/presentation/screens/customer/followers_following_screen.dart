import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/degree_chip.dart';
import '../../widgets/premium_badge.dart';

class FollowUserItem {
  final String id;
  final String name;
  final String headline;
  final String? avatarUrl;
  final String trade;
  final int degree;
  final bool isPro;
  bool isFollowing;

  FollowUserItem({
    required this.id,
    required this.name,
    required this.headline,
    this.avatarUrl,
    required this.trade,
    this.degree = 1,
    this.isPro = false,
    required this.isFollowing,
  });
}

class FollowersFollowingScreen extends StatefulWidget {
  final int initialIndex;

  const FollowersFollowingScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<FollowersFollowingScreen> createState() => _FollowersFollowingScreenState();
}

class _FollowersFollowingScreenState extends State<FollowersFollowingScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';

  late List<FollowUserItem> _followers;
  late List<FollowUserItem> _following;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this, initialIndex: widget.initialIndex);

    _followers = [
      FollowUserItem(
        id: 'u-1',
        name: 'Marcus Vance',
        headline: 'Journeyman Electrician • Industrial Automation & PLC',
        trade: 'Electrical',
        degree: 1,
        isPro: true,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-2',
        name: 'Elena Rostova',
        headline: 'Master Plumber • Backflow Prevention Specialist',
        trade: 'Plumbing',
        degree: 2,
        isPro: false,
        isFollowing: false,
      ),
      FollowUserItem(
        id: 'u-3',
        name: 'Derrick Owens',
        headline: 'HVAC-R Technician • Commercial VRF Systems',
        trade: 'HVAC',
        degree: 2,
        isPro: true,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-4',
        name: 'Mateo Hernandez',
        headline: 'Structural Welder • AWS D1.1 Certified',
        trade: 'Welding',
        degree: 1,
        isPro: false,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-5',
        name: 'Sarah Jenkins',
        headline: 'Solar PV Site Lead & Energy Storage Installer',
        trade: 'Renewable',
        degree: 2,
        isPro: true,
        isFollowing: false,
      ),
    ];

    _following = [
      FollowUserItem(
        id: 'u-1',
        name: 'Marcus Vance',
        headline: 'Journeyman Electrician • Industrial Automation & PLC',
        trade: 'Electrical',
        degree: 1,
        isPro: true,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-3',
        name: 'Derrick Owens',
        headline: 'HVAC-R Technician • Commercial VRF Systems',
        trade: 'HVAC',
        degree: 2,
        isPro: true,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-4',
        name: 'Mateo Hernandez',
        headline: 'Structural Welder • AWS D1.1 Certified',
        trade: 'Welding',
        degree: 1,
        isPro: false,
        isFollowing: true,
      ),
      FollowUserItem(
        id: 'u-6',
        name: 'Precision Power Contractors',
        headline: 'Commercial Electrical General Contractor • 250+ Crew',
        trade: 'Electrical Contracting',
        degree: 2,
        isPro: true,
        isFollowing: true,
      ),
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _toggleFollow(FollowUserItem user) {
    setState(() {
      user.isFollowing = !user.isFollowing;
      if (user.isFollowing) {
        if (!_following.any((f) => f.id == user.id)) {
          _following.add(user);
        }
      } else {
        _following.removeWhere((f) => f.id == user.id);
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(user.isFollowing ? 'Following ${user.name}' : 'Unfollowed ${user.name}'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  List<FollowUserItem> _filter(List<FollowUserItem> list) {
    if (_query.isEmpty) return list;
    final q = _query.toLowerCase();
    return list.where((u) =>
        u.name.toLowerCase().contains(q) ||
        u.headline.toLowerCase().contains(q) ||
        u.trade.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Network Following',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: SizedBox(
                  height: 38,
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: 'Search people and contractors...',
                      hintStyle: const TextStyle(fontSize: 13),
                      prefixIcon: const Icon(Icons.search, size: 18),
                      contentPadding: EdgeInsets.zero,
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                ),
              ),
              TabBar(
                controller: _tabController,
                labelColor: AppColors.brand,
                unselectedLabelColor: AppColors.midText,
                indicatorColor: AppColors.brand,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: [
                  Tab(text: 'Followers (${_followers.length})'),
                  Tab(text: 'Following (${_following.length})'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildUserList(_filter(_followers), isFollowersTab: true),
          _buildUserList(_filter(_following), isFollowersTab: false),
        ],
      ),
    );
  }

  Widget _buildUserList(List<FollowUserItem> users, {required bool isFollowersTab}) {
    if (users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.people_outline, size: 48, color: AppColors.midText),
              const SizedBox(height: 12),
              Text(
                _query.isNotEmpty
                    ? 'No trade connections match "$_query"'
                    : (isFollowersTab ? 'No followers yet' : 'Not following any trade pros yet'),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              const Text(
                'Connect with fellow journeymen, contractors, and apprentices in your trade.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.midText, fontSize: 12),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: users.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final user = users[index];
        return Card(
          margin: EdgeInsets.zero,
          elevation: 0.5,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radius),
            side: const BorderSide(color: AppColors.border),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(AppTheme.radius),
            onTap: () => context.push('/workers/${user.id}'),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  PremiumBadge(
                    isPremium: user.isPro,
                    child: CircleAvatar(
                      radius: 24,
                      backgroundColor: AppColors.brandLight,
                      child: Text(
                        user.name.substring(0, 1),
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.brand, fontSize: 18),
                      ),
                    ),
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
                                user.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                              ),
                            ),
                            const SizedBox(width: 6),
                            DegreeChip(degree: user.degree),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user.headline,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: AppColors.midText),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 32,
                    child: user.isFollowing
                        ? OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              side: const BorderSide(color: AppColors.border),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            onPressed: () => _toggleFollow(user),
                            child: const Text('Following',
                                style: TextStyle(fontSize: 12, color: AppColors.darkText, fontWeight: FontWeight.w600)),
                          )
                        : ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.brand,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 0,
                            ),
                            onPressed: () => _toggleFollow(user),
                            child: const Text('+ Follow',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
