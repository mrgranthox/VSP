import 'package:flutter/material.dart';
import '../../data/models/trade_category_model.dart';
import '../../data/models/worker_profile_model.dart';
import '../../data/repositories/discovery_repository.dart';
import '../../data/repositories/search_repository.dart';

class SearchProvider extends ChangeNotifier {
  final SearchRepository _searchRepo;
  final DiscoveryRepository _discoveryRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isMapView = false;
  bool get isMapView => _isMapView;

  String _query = '';
  String get query => _query;

  String? _selectedTradeId;
  String? get selectedTradeId => _selectedTradeId;

  double _radiusKm = 25.0;
  double get radiusKm => _radiusKm;

  double _minRating = 0.0;
  double get minRating => _minRating;

  List<TradeCategory> _categories = [];
  List<TradeCategory> get categories => _categories;

  List<WorkerProfile> _results = [];
  List<WorkerProfile> get results => _results;

  SearchProvider({
    required this._searchRepo,
    required this._discoveryRepo,
  }) {
    _init();
  }

  Future<void> _init() async {
    _categories = await _discoveryRepo.getTradeCategories();
    notifyListeners();
    search();
  }

  void toggleViewMode() {
    _isMapView = !_isMapView;
    notifyListeners();
  }

  void setQuery(String q) {
    _query = q;
    search();
  }

  void selectTrade(String? tradeId) {
    _selectedTradeId = _selectedTradeId == tradeId ? null : tradeId;
    notifyListeners();
    search();
  }

  void setRadius(double radius) {
    _radiusKm = radius;
    notifyListeners();
    search();
  }

  void setMinRating(double rating) {
    _minRating = rating;
    notifyListeners();
    search();
  }

  Future<void> search() async {
    _isLoading = true;
    notifyListeners();

    try {
      _results = await _searchRepo.searchWorkers(
        tradeCategoryId: _selectedTradeId,
        query: _query,
        radiusKm: _radiusKm,
        minRating: _minRating > 0 ? _minRating : null,
      );
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }
}
