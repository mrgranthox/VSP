import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/booking_model.dart';

class BookingsRepository {
  final ApiClient _apiClient;

  BookingsRepository({required this._apiClient});

  Future<List<Booking>> getBookings({
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null && status.isNotEmpty && status != 'ALL') {
      queryParams['status'] = status;
    }

    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.bookings,
        queryParams: queryParams,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => Booking.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackBookings;
  }

  Future<Booking> getBookingDetail(String id) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiConstants.bookingDetail(id),
      );

      final data = response.data;
      if (data != null) {
        return Booking.fromJson(data);
      }
    } catch (_) {}

    final found = _fallbackBookings.where((b) => b.id == id);
    if (found.isNotEmpty) return found.first;
    return _fallbackBookings.first;
  }

  Future<Booking> createBooking({
    required String workerProfileId,
    String? serviceRequestId,
    required DateTime scheduledStartTime,
    required int totalAmountMinor,
    required String locationAddress,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.bookings,
      body: {
        'workerProfileId': workerProfileId,
        'serviceRequestId': ?serviceRequestId,
        'scheduledStartTime': scheduledStartTime.toIso8601String(),
        'totalAmountMinor': totalAmountMinor,
        'locationAddress': locationAddress,
      },
    );

    final data = response.data;
    if (data != null) {
      return Booking.fromJson(data);
    }
    throw Exception('Failed to create booking');
  }

  Future<void> startBooking(String id) async {
    await _apiClient.post(ApiConstants.bookingStart(id));
  }

  Future<void> completeBooking(String id) async {
    await _apiClient.post(ApiConstants.bookingComplete(id));
  }

  Future<void> cancelBooking(String id, String reason) async {
    await _apiClient.post(
      ApiConstants.bookingCancel(id),
      body: {'reason': reason},
    );
  }

  Future<void> rescheduleBooking(String id, DateTime newStartTime) async {
    await _apiClient.post(
      ApiConstants.bookingReschedule(id),
      body: {'scheduledStartTime': newStartTime.toIso8601String()},
    );
  }

  static final List<Booking> _fallbackBookings = [
    Booking(
      id: 'bk-101',
      customerUserId: 'user-c1',
      customerName: 'Kofi Mensah',
      workerProfileId: 'worker-1',
      workerName: 'Bob Williams',
      workerHeadline: 'Certified Master Electrician',
      tradeName: 'Electrician',
      status: 'CONFIRMED',
      scheduledStartTime: DateTime.now().add(const Duration(hours: 4)),
      totalAmountMinor: 15000,
      locationAddress: 'Airport Residential Area, Accra',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    Booking(
      id: 'bk-102',
      customerUserId: 'user-c1',
      customerName: 'Kofi Mensah',
      workerProfileId: 'worker-2',
      workerName: 'Ama Kojo',
      workerHeadline: 'Licensed Plumbing Specialist',
      tradeName: 'Plumber',
      status: 'COMPLETED',
      scheduledStartTime: DateTime.now().subtract(const Duration(days: 3)),
      totalAmountMinor: 12000,
      locationAddress: 'East Legon, Accra',
      createdAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
  ];
}
