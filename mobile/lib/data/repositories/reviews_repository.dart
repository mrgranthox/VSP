import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/review_model.dart';

class ReviewsRepository {
  final ApiClient _apiClient;

  ReviewsRepository({required this._apiClient});

  Future<List<Review>> getWorkerReviews(
    String workerId, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.workerReviews(workerId),
        queryParams: {'page': page, 'limit': limit},
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => Review.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackReviews;
  }

  Future<Review> submitReview({
    required String bookingId,
    required double rating,
    required String comment,
    Map<String, double>? dimensions,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.reviews,
      body: {
        'bookingId': bookingId,
        'rating': rating,
        'comment': comment,
        'dimensions': ?dimensions,
      },
    );

    final data = response.data;
    if (data != null) {
      return Review.fromJson(data);
    }
    throw Exception('Failed to submit review');
  }

  static final List<Review> _fallbackReviews = [
    Review(
      id: 'rev-1',
      bookingId: 'bk-102',
      customerUserId: 'user-c1',
      customerName: 'Kwame Asante',
      workerProfileId: 'worker-1',
      rating: 5.0,
      comment: 'Super fast and clean installation! He came right on time and fixed all our distribution board issues.',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      dimensions: [
        ReviewDimensionScore(name: 'Punctuality', rating: 5.0),
        ReviewDimensionScore(name: 'Quality', rating: 5.0),
        ReviewDimensionScore(name: 'Communication', rating: 5.0),
        ReviewDimensionScore(name: 'Value', rating: 5.0),
      ],
    ),
    Review(
      id: 'rev-2',
      bookingId: 'bk-100',
      customerUserId: 'user-c2',
      customerName: 'Esi Nyarko',
      workerProfileId: 'worker-1',
      rating: 4.8,
      comment: 'Very polite professional. Reasonable pricing and explained everything he was doing.',
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
      dimensions: [
        ReviewDimensionScore(name: 'Punctuality', rating: 4.5),
        ReviewDimensionScore(name: 'Quality', rating: 5.0),
        ReviewDimensionScore(name: 'Communication', rating: 5.0),
        ReviewDimensionScore(name: 'Value', rating: 4.7),
      ],
    ),
  ];
}
