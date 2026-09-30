import 'package:flutter/material.dart';
import '../../data/models/post_model.dart';
import '../../data/repositories/social_repository.dart';

class FeedProvider extends ChangeNotifier {
  final SocialRepository socialRepo;
  SocialRepository get _socialRepo => socialRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<Post> _posts = [];
  List<Post> get posts => _posts;

  final Map<String, List<PostComment>> _commentsByPostId = {};
  Map<String, List<PostComment>> get commentsByPostId => _commentsByPostId;

  String? _selectedHashtagFilter;
  String? get selectedHashtagFilter => _selectedHashtagFilter;

  FeedProvider({required this.socialRepo}) {
    loadFeed();
  }

  void filterByHashtag(String? tag) {
    _selectedHashtagFilter = tag;
    notifyListeners();
  }

  List<Post> get filteredPosts {
    if (_selectedHashtagFilter == null || _selectedHashtagFilter!.isEmpty) {
      return _posts;
    }
    final clean = _selectedHashtagFilter!.replaceAll('#', '').toLowerCase();
    return _posts.where((p) {
      return p.hashtags.any((t) => t.toLowerCase() == clean) ||
          p.content.toLowerCase().contains('#$clean');
    }).toList();
  }

  Future<void> loadFeed() async {
    _isLoading = true;
    notifyListeners();

    try {
      _posts = await _socialRepo.getFeed();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  void toggleLike(String postId) {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index != -1) {
      final post = _posts[index];
      if (post.reactionType != null || post.isLiked) {
        removeReaction(postId);
      } else {
        reactToPost(postId, 'LIKE');
      }
    }
  }

  void reactToPost(String postId, String reactionType) {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index != -1) {
      final post = _posts[index];
      final previousReaction = post.reactionType;
      final newCounts = Map<String, int>.from(post.reactionCounts);

      // Decrement previous if existed
      if (previousReaction != null && (newCounts[previousReaction] ?? 0) > 0) {
        newCounts[previousReaction] = newCounts[previousReaction]! - 1;
      }

      // Increment new
      newCounts[reactionType] = (newCounts[reactionType] ?? 0) + 1;

      final totalLikes = newCounts.values.fold(0, (a, b) => a + b);

      _posts[index] = post.copyWith(
        reactionType: reactionType,
        reactionCounts: newCounts,
        likesCount: totalLikes,
        isLiked: true,
      );
      notifyListeners();

      _socialRepo.reactToPost(postId, reactionType);
    }
  }

  void removeReaction(String postId) {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index != -1) {
      final post = _posts[index];
      final previousReaction = post.reactionType;
      final newCounts = Map<String, int>.from(post.reactionCounts);

      if (previousReaction != null && (newCounts[previousReaction] ?? 0) > 0) {
        newCounts[previousReaction] = newCounts[previousReaction]! - 1;
      }

      final totalLikes = newCounts.values.fold(0, (a, b) => a + b);

      _posts[index] = post.copyWith(
        clearReactionType: true,
        reactionCounts: newCounts,
        likesCount: totalLikes,
        isLiked: false,
      );
      notifyListeners();

      _socialRepo.removeReaction(postId);
    }
  }

  Future<void> repostPost(String postId, [String? comment]) async {
    final index = _posts.indexWhere((p) => p.id == postId);
    if (index != -1) {
      final post = _posts[index];
      final wasReposted = post.isReposted;
      final newCount = wasReposted ? post.repostsCount - 1 : post.repostsCount + 1;

      _posts[index] = post.copyWith(
        isReposted: !wasReposted,
        repostsCount: newCount > 0 ? newCount : 0,
      );

      // If user added thoughts, also add a new repost post to feed top
      if (comment != null && comment.isNotEmpty) {
        final newPost = Post(
          id: 'mock-repost-${DateTime.now().millisecondsSinceEpoch}',
          workerProfileId: 'w-me',
          authorName: 'You',
          tradeName: 'Professional Craftsman',
          content: comment,
          repostOfId: post.id,
          repostOf: post,
          repostComment: comment,
          createdAt: DateTime.now(),
        );
        _posts.insert(0, newPost);
      }

      notifyListeners();

      _socialRepo.repostPost(postId, comment: comment);
    }
  }

  Future<void> votePoll(String pollId, String optionId) async {
    for (int i = 0; i < _posts.length; i++) {
      final p = _posts[i];
      if (p.poll != null && p.poll!.id == pollId) {
        final poll = p.poll!;
        final previousVoted = poll.myVotedOptionId;
        if (previousVoted == optionId) return;

        final newOptions = poll.options.map((opt) {
          int count = opt.voteCount;
          if (opt.id == optionId) count++;
          if (opt.id == previousVoted && count > 0) count--;
          return opt.copyWith(voteCount: count);
        }).toList();

        final total = newOptions.fold(0, (sum, o) => sum + o.voteCount);
        final recalculated = newOptions.map((o) {
          final pct = total > 0 ? (o.voteCount / total * 100.0) : 0.0;
          return o.copyWith(percentage: pct);
        }).toList();

        final updatedPoll = poll.copyWith(
          options: recalculated,
          totalVotes: total,
          myVotedOptionId: optionId,
        );

        _posts[i] = p.copyWith(poll: updatedPoll);
        notifyListeners();

        _socialRepo.votePoll(pollId, optionId);
        break;
      }
    }
  }

  Future<void> loadPostComments(String postId) async {
    try {
      final comments = await _socialRepo.getPostComments(postId);
      _commentsByPostId[postId] = comments;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> addComment(String postId, String content, [String? parentCommentId]) async {
    try {
      PostComment newComment;
      if (parentCommentId != null) {
        newComment = await _socialRepo.addReply(parentCommentId, content);
      } else {
        newComment = await _socialRepo.addComment(postId, content);
      }

      final list = _commentsByPostId[postId] ?? [];
      if (parentCommentId == null) {
        list.insert(0, newComment);
      } else {
        // Find parent and add reply
        final parentIndex = list.indexWhere((c) => c.id == parentCommentId);
        if (parentIndex != -1) {
          final parent = list[parentIndex];
          final updatedReplies = List<PostComment>.from(parent.replies)..add(newComment);
          list[parentIndex] = PostComment(
            id: parent.id,
            postId: parent.postId,
            authorName: parent.authorName,
            authorAvatarUrl: parent.authorAvatarUrl,
            authorHeadline: parent.authorHeadline,
            content: parent.content,
            parentCommentId: parent.parentCommentId,
            replies: updatedReplies,
            createdAt: parent.createdAt,
          );
        } else {
          list.add(newComment);
        }
      }

      _commentsByPostId[postId] = list;

      // Update post comments count
      final pIndex = _posts.indexWhere((p) => p.id == postId);
      if (pIndex != -1) {
        _posts[pIndex] = _posts[pIndex].copyWith(
          commentsCount: _posts[pIndex].commentsCount + 1,
        );
      }

      notifyListeners();
    } catch (_) {}
  }

  Future<bool> createPost(String content, [String? imageUrl]) async {
    try {
      final newPost = await _socialRepo.createPost(
        content: content,
        imageUrl: imageUrl,
      );
      _posts.insert(0, newPost);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }
}
