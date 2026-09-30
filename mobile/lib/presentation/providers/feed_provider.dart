import 'package:flutter/material.dart';
import '../../data/models/post_model.dart';
import '../../data/repositories/social_repository.dart';

class FeedProvider extends ChangeNotifier {
  final SocialRepository _socialRepo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<Post> _posts = [];
  List<Post> get posts => _posts;

  FeedProvider({required this._socialRepo}) {
    loadFeed();
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
      final newIsLiked = !post.isLiked;
      final newLikes = newIsLiked ? post.likesCount + 1 : post.likesCount - 1;

      _posts[index] = post.copyWith(
        isLiked: newIsLiked,
        likesCount: newLikes,
      );
      notifyListeners();

      _socialRepo.toggleLike(postId);
    }
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
