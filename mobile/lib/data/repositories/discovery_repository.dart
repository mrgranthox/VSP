import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/trade_category_model.dart';
import '../models/worker_profile_model.dart';

class DiscoveryRepository {
  final ApiClient _apiClient;

  DiscoveryRepository({required this._apiClient});

  Future<List<WorkerProfile>> getFeaturedWorkers() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.discoveryFeatured,
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => WorkerProfile.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback to sample data for smooth preview
    }

    return _fallbackFeaturedWorkers;
  }

  Future<List<TradeCategory>> getTradeCategories() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.tradeCategories,
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => TradeCategory.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback
    }

    return _fallbackTradeCategories;
  }

  Future<List<CityConfig>> getCities() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.cities,
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => CityConfig.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback
    }

    return [
      CityConfig(id: 'accra', name: 'Accra', slug: 'accra', lat: 5.6037, lng: -0.1870, radiusKm: 35),
      CityConfig(id: 'kumasi', name: 'Kumasi', slug: 'kumasi', lat: 6.6885, lng: -1.6244, radiusKm: 30),
      CityConfig(id: 'takoradi', name: 'Takoradi', slug: 'takoradi', lat: 4.9016, lng: -1.7831, radiusKm: 25),
    ];
  }

  static final List<TradeCategory> _fallbackTradeCategories = [
    TradeCategory(id: 'elec', name: 'Electrician', slug: 'electrician', icon: '⚡', workerCount: 142),
    TradeCategory(id: 'plumb', name: 'Plumber', slug: 'plumber', icon: '🔧', workerCount: 98),
    TradeCategory(id: 'carp', name: 'Carpenter', slug: 'carpenter', icon: '🪚', workerCount: 76),
    TradeCategory(id: 'paint', name: 'Painter', slug: 'painter', icon: '🎨', workerCount: 64),
    TradeCategory(id: 'hvac', name: 'AC & Cooling', slug: 'ac-cooling', icon: '❄️', workerCount: 53),
    TradeCategory(id: 'mason', name: 'Masonry', slug: 'masonry', icon: '🧱', workerCount: 41),
    TradeCategory(id: 'weld', name: 'Welder', slug: 'welder', icon: '🔥', workerCount: 38),
    TradeCategory(id: 'clean', name: 'Cleaner', slug: 'cleaner', icon: '🧹', workerCount: 89),
  ];

  static List<WorkerProfile> get fallbackFeaturedWorkers => _fallbackFeaturedWorkers;

  static final List<WorkerProfile> _fallbackFeaturedWorkers = [
    WorkerProfile(
      id: 'worker-1',
      userId: 'user-w1',
      headline: 'Certified Master Electrician with 10+ Years Experience',
      bio: 'Specializing in residential wiring, fault diagnosis, generator maintenance, and solar inverters in Accra & Tema.',
      experienceYears: 10,
      avgRating: 4.9,
      totalReviews: 87,
      jobsCompleted: 142,
      hourlyRateMinor: 15000,
      isVerified: true,
      isFeatured: true,
      tradeCategories: [
        TradeCategory(id: 'elec', name: 'Electrician', slug: 'electrician', icon: '⚡')
      ],
      services: [
        WorkerService(id: 's1', title: 'Electrical Diagnostic & Repair', priceMinor: 12000, pricingType: 'FIXED'),
        WorkerService(id: 's2', title: 'Solar Inverter Setup', priceMinor: 35000, pricingType: 'FIXED'),
      ],
    ),
    WorkerProfile(
      id: 'worker-2',
      userId: 'user-w2',
      headline: 'Licensed Plumbing Specialist — 24/7 Rapid Response',
      bio: 'Leak detection, pipe repairs, drainage cleaning, and water heater installations across Greater Accra.',
      experienceYears: 7,
      avgRating: 4.8,
      totalReviews: 64,
      jobsCompleted: 98,
      hourlyRateMinor: 12000,
      isVerified: true,
      isFeatured: true,
      tradeCategories: [
        TradeCategory(id: 'plumb', name: 'Plumber', slug: 'plumber', icon: '🔧')
      ],
    ),
    WorkerProfile(
      id: 'worker-3',
      userId: 'user-w3',
      headline: 'Architectural Carpenter & Custom Cabinetry',
      bio: 'Bespoke wardrobes, kitchen cabinets, wooden flooring, and roof carcass installations.',
      experienceYears: 8,
      avgRating: 4.9,
      totalReviews: 52,
      jobsCompleted: 76,
      hourlyRateMinor: 18000,
      isVerified: true,
      isFeatured: false,
      tradeCategories: [
        TradeCategory(id: 'carp', name: 'Carpenter', slug: 'carpenter', icon: '🪚')
      ],
    ),
  ];
}
