import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/search_provider.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/worker_card.dart';

class SearchScreen extends StatelessWidget {
  final String? initialCategoryId;

  const SearchScreen({super.key, this.initialCategoryId});

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
                                Icons.star,
                                size: 16,
                                color: isSelected ? const Color(0xFFF59E0B) : AppColors.lightText,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${star.toInt()}+',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? AppColors.brandDark : AppColors.darkText,
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

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Find Trades'),
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
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              onChanged: (val) => search.setQuery(val),
              decoration: InputDecoration(
                hintText: 'Search by keyword, skill, or area...',
                prefixIcon: const Icon(Icons.search, color: AppColors.lightText),
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

          // Categories horizontal strip
          Container(
            color: Colors.white,
            padding: const EdgeInsets.only(bottom: 12),
            child: SizedBox(
              height: 38,
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
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isAllSelected ? Colors.white : AppColors.darkText,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
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
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? Colors.white : AppColors.darkText,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                      side: BorderSide.none,
                    ),
                  );
                },
              ),
            ),
          ),

          // Results counter
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${search.results.length} workers found',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.midText,
                  ),
                ),
                Text(
                  'Radius: ${search.radiusKm.toInt()}km',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.lightText,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Search Results or Map View
          Expanded(
            child: search.isLoading
                ? const Center(child: CircularProgressIndicator())
                : search.results.isEmpty
                    ? EmptyStateView(
                        icon: Icons.search_off_rounded,
                        title: 'No workers matched',
                        message:
                            'Try expanding your radius or selecting a different trade category.',
                        buttonText: 'Reset Filters',
                        onButtonPressed: () {
                          search.selectTrade(null);
                          search.setQuery('');
                          search.setRadius(25);
                          search.setMinRating(0);
                        },
                      )
                    : search.isMapView
                        ? _buildMapPlaceholder(context, search)
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            itemCount: search.results.length,
                            itemBuilder: (context, index) {
                              final worker = search.results[index];
                              return WorkerCard(
                                worker: worker,
                                onTap: () => context.push('/worker/${worker.id}'),
                                onBookTap: () =>
                                    context.push('/book-worker/${worker.id}'),
                                onMessageTap: () =>
                                    context.push('/chat/${worker.id}'),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapPlaceholder(BuildContext context, SearchProvider search) {
    return Stack(
      children: [
        // Interactive simulated map surface with grid and pins
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
                      'Live Geolocation Map: Greater Accra',
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
        // Horizontal sliding cards at bottom of map
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
