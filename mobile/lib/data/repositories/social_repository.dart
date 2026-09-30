import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/post_model.dart';

class SocialRepository {
  final ApiClient _apiClient;

  SocialRepository({required this._apiClient});

  Future<List<Post>> getFeed({int page = 1, int limit = 20}) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.socialFeed,
        queryParams: {'page': page, 'limit': limit},
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => Post.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackPosts;
  }

  Future<Post> getPostDetail(String id) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        ApiConstants.postDetail(id),
        requiresAuth: false,
      );

      final data = response.data;
      if (data != null) {
        return Post.fromJson(data);
      }
    } catch (_) {}

    final found = _fallbackPosts.where((p) => p.id == id);
    if (found.isNotEmpty) return found.first;
    return _fallbackPosts.first;
  }

  Future<Post> createPost({
    required String content,
    String? imageUrl,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.createPost,
      body: {
        'content': content,
        'imageUrl': ?imageUrl,
      },
    );

    final data = response.data;
    if (data != null) {
      return Post.fromJson(data);
    }
    throw Exception('Failed to create post');
  }

  Future<void> toggleLike(String postId) async {
    try {
      await _apiClient.post(ApiConstants.postLikes(postId));
    } catch (_) {}
  }

  Future<PostComment> addComment(String postId, String content) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.postComments(postId),
      body: {'content': content},
    );

    final data = response.data;
    if (data != null) {
      return PostComment.fromJson(data);
    }
    throw Exception('Failed to post comment');
  }

  static final List<Post> _fallbackPosts = [
    Post(
      id: 'post-1',
      workerProfileId: 'worker-1',
      authorName: 'Bob Williams',
      tradeName: 'Electrician',
      content: 'Just finished a complete 3-phase rewire for a commercial warehouse in Industrial Area! Everything tested, certified, and compliant with national safety codes.',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
      likesCount: 24,
      commentsCount: 5,
      isLiked: false,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    Post(
      id: 'post-2',
      workerProfileId: 'worker-2',
      authorName: 'Ama Kojo',
      tradeName: 'Plumber',
      content: 'Pro-tip for homeowners: Regular descaling of your water heater will prevent pressure loss and element burnout. Reach out if your pressure seems low!',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800',
      likesCount: 38,
      commentsCount: 9,
      isLiked: true,
      createdAt: DateTime.now().subtract(const Duration(hours: 7)),
    ),
  ];
}
