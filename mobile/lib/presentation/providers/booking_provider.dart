import 'package:flutter/material.dart';
import '../../data/models/booking_model.dart';
import '../../data/repositories/bookings_repository.dart';

class BookingProvider extends ChangeNotifier {
  final BookingsRepository _bookingsRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String _selectedStatus = 'ALL';
  String get selectedStatus => _selectedStatus;

  List<Booking> _bookings = [];
  List<Booking> get bookings => _bookings;

  BookingProvider({required this._bookingsRepo}) {
    loadBookings();
  }

  void setFilterStatus(String status) {
    _selectedStatus = status;
    loadBookings();
  }

  Future<void> loadBookings() async {
    _isLoading = true;
    notifyListeners();

    try {
      _bookings = await _bookingsRepo.getBookings(
        status: _selectedStatus == 'ALL' ? null : _selectedStatus,
      );
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createBooking({
    required String workerProfileId,
    required DateTime scheduledStartTime,
    required int totalAmountMinor,
    required String locationAddress,
  }) async {
    try {
      final newBooking = await _bookingsRepo.createBooking(
        workerProfileId: workerProfileId,
        scheduledStartTime: scheduledStartTime,
        totalAmountMinor: totalAmountMinor,
        locationAddress: locationAddress,
      );
      _bookings.insert(0, newBooking);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> cancelBooking(String id, String reason) async {
    try {
      await _bookingsRepo.cancelBooking(id, reason);
      await loadBookings();
    } catch (_) {}
  }

  Future<void> rescheduleBooking(String id, DateTime newTime) async {
    try {
      await _bookingsRepo.rescheduleBooking(id, newTime);
      await loadBookings();
    } catch (_) {}
  }

  Future<void> completeBooking(String id) async {
    try {
      await _bookingsRepo.completeBooking(id);
      await loadBookings();
    } catch (_) {}
  }

  Future<void> updateBookingStatus(String id, String status) async {
    try {
      if (status.toUpperCase() == 'IN_PROGRESS') {
        await _bookingsRepo.startBooking(id);
      } else if (status.toUpperCase() == 'COMPLETED') {
        await _bookingsRepo.completeBooking(id);
      }
      await loadBookings();
    } catch (_) {}
  }
}
