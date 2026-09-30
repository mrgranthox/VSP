import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/poll_model.dart';
import '../models/post_model.dart';

class SocialRepository {
  final ApiClient apiClient;
  ApiClient get _apiClient => apiClient;

  SocialRepository({required this.apiClient});

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
    try {
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
    } catch (_) {}

    return Post(
      id: 'mock-p-${DateTime.now().millisecondsSinceEpoch}',
      workerProfileId: 'w-me',
      authorName: 'You',
      tradeName: 'Professional Craftsman',
      content: content,
      imageUrl: imageUrl,
      createdAt: DateTime.now(),
    );
  }

  Future<void> toggleLike(String postId) async {
    await reactToPost(postId, 'LIKE');
  }

  Future<void> reactToPost(String postId, String reactionType) async {
    try {
      await _apiClient.put(
        '/social/posts/$postId/react',
        body: {'reactionType': reactionType},
      );
    } catch (_) {}
  }

  Future<void> removeReaction(String postId) async {
    try {
      await _apiClient.delete('/social/posts/$postId/react');
    } catch (_) {}
  }

  Future<void> repostPost(String postId, {String? comment}) async {
    try {
      await _apiClient.post(
        '/social/posts/$postId/repost',
        body: {'comment': ?comment},
      );
    } catch (_) {}
  }

  Future<void> votePoll(String pollId, String optionId) async {
    try {
      await _apiClient.post(
        '/social/polls/$pollId/vote',
        body: {'optionId': optionId},
      );
    } catch (_) {}
  }

  Future<List<PostComment>> getPostComments(String postId) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.postComments(postId),
        requiresAuth: false,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => PostComment.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackComments;
  }

  Future<PostComment> addComment(String postId, String content) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiConstants.postComments(postId),
        body: {'content': content},
      );

      final data = response.data;
      if (data != null) {
        return PostComment.fromJson(data);
      }
    } catch (_) {}

    return PostComment(
      id: 'mock-cmt-${DateTime.now().millisecondsSinceEpoch}',
      postId: postId,
      authorName: 'You',
      content: content,
      createdAt: DateTime.now(),
    );
  }

  Future<PostComment> addReply(String parentCommentId, String content) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/social/comments/$parentCommentId/replies',
        body: {'content': content},
      );

      final data = response.data;
      if (data != null) {
        return PostComment.fromJson(data);
      }
    } catch (_) {}

    return PostComment(
      id: 'mock-rep-${DateTime.now().millisecondsSinceEpoch}',
      postId: '',
      parentCommentId: parentCommentId,
      authorName: 'You',
      content: content,
      createdAt: DateTime.now(),
    );
  }

  static final List<PostComment> _fallbackComments = [
    PostComment(
      id: 'c-1',
      postId: 'post-1',
      authorName: 'Kwame Mensah',
      authorHeadline: 'Commercial Electrician',
      content: 'Excellent distribution work! What breaker sizes did you use for the main sub-panel?',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      replies: [
        PostComment(
          id: 'c-1-rep-1',
          postId: 'post-1',
          parentCommentId: 'c-1',
          authorName: 'Bob Williams',
          authorHeadline: 'Master Electrician',
          content: 'We installed 250A MCCBs with thermal magnetic protection.',
          createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        ),
      ],
    ),
    PostComment(
      id: 'c-2',
      postId: 'post-1',
      authorName: 'Ama Addae',
      authorHeadline: 'HVAC Lead',
      content: 'Clean trunking run. Safe working standards on display.',
      createdAt: DateTime.now().subtract(const Duration(minutes: 45)),
    ),
  ];

  static final List<Post> _fallbackPosts = [
    Post(
      id: 'post-1',
      workerProfileId: 'worker-1',
      authorName: 'Bob Williams',
      authorHeadline: 'Master Electrician • Industrial Automation Lead',
      tradeName: 'Electrician',
      content: 'Just finished a complete 3-phase rewire for a commercial warehouse in Industrial Area! Everything tested, certified, and compliant with national safety codes. #SolarInstallation #GhanaTrades #ElectricalEngineering',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
      likesCount: 28,
      commentsCount: 6,
      repostsCount: 3,
      isLiked: true,
      reactionType: 'LIKE',
      reactionCounts: {'LIKE': 22, 'CELEBRATE': 4, 'INSIGHTFUL': 2},
      hashtags: ['SolarInstallation', 'GhanaTrades', 'ElectricalEngineering'],
      connectionDegree: 1,
      isOpenToWork: true,
      isPremium: true,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    Post(
      id: 'post-2',
      workerProfileId: 'worker-2',
      authorName: 'Ama Kojo',
      authorHeadline: 'Lead MEP Contractor & Hydronics Specialist',
      tradeName: 'Plumber',
      content: 'Pro-tip for facility managers and homeowners: Regular descaling of commercial water heaters prevents element burnout and saves up to 30% in energy bills. #PlumbingTips #PreventativeMaintenance',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800',
      likesCount: 42,
      commentsCount: 11,
      repostsCount: 5,
      isLiked: false,
      reactionCounts: {'LIKE': 30, 'LOVE': 8, 'SUPPORT': 4},
      hashtags: ['PlumbingTips', 'PreventativeMaintenance'],
      poll: const Poll(
        id: 'poll-trade-1',
        postId: 'post-2',
        question: 'How often do you perform preventative maintenance on water pressure pumps?',
        options: [
          PollOption(id: 'po-1', label: 'Every 3 months', voteCount: 24, percentage: 48),
          PollOption(id: 'po-2', label: 'Every 6 months', voteCount: 18, percentage: 36),
          PollOption(id: 'po-3', label: 'Only when leaking', voteCount: 8, percentage: 16),
        ],
        totalVotes: 50,
      ),
      connectionDegree: 2,
      createdAt: DateTime.now().subtract(const Duration(hours: 7)),
    ),
  ];
}
