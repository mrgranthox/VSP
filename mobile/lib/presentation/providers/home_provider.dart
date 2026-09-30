import 'package:flutter/material.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/trade_category_model.dart';
import '../../data/models/worker_profile_model.dart';
import '../../data/repositories/bookings_repository.dart';
import '../../data/repositories/discovery_repository.dart';

class HomeProvider extends ChangeNotifier {
  final DiscoveryRepository discoveryRepo;
  final BookingsRepository bookingsRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<WorkerProfile> _featuredWorkers = [];
  List<WorkerProfile> get featuredWorkers => _featuredWorkers;

  List<TradeCategory> _tradeCategories = [];
  List<TradeCategory> get tradeCategories => _tradeCategories;

  Booking? _activeBooking;
  Booking? get activeBooking => _activeBooking;

  HomeProvider({
    required this.discoveryRepo,
    required this.bookingsRepo,
  }) {
    loadHomeData();
  }

  Future<void> loadHomeData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final results = await Future.wait([
        discoveryRepo.getFeaturedWorkers(),
        discoveryRepo.getTradeCategories(),
        bookingsRepo.getBookings(status: 'CONFIRMED', limit: 1),
      ]);

      _featuredWorkers = results[0] as List<WorkerProfile>;
      _tradeCategories = results[1] as List<TradeCategory>;
      final bookings = results[2] as List<Booking>;
      if (bookings.isNotEmpty) {
        _activeBooking = bookings.first;
      }
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }
}
