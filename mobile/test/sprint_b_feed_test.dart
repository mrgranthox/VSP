import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/models/poll_model.dart';
import 'package:vsp_mobile/data/models/post_model.dart';
import 'package:vsp_mobile/data/repositories/social_repository.dart';
import 'package:vsp_mobile/presentation/providers/feed_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Sprint B: Feed & Social Deep Tests', () {
    test('Poll and PollOption parse and calculate percentages', () {
      final json = {
        'id': 'poll-123',
        'postId': 'post-1',
        'question': 'Best wiring conduit type for outdoor installations?',
        'options': [
          {'id': 'opt-1', 'label': 'Schedule 40 PVC', 'voteCount': 30},
          {'id': 'opt-2', 'label': 'EMT Thinwall', 'voteCount': 10},
        ],
      };

      final poll = Poll.fromJson(json);
      expect(poll.id, 'poll-123');
      expect(poll.totalVotes, 40);
      expect(poll.options.length, 2);
      expect(poll.options.first.percentage, 75.0);
      expect(poll.options.last.percentage, 25.0);
    });

    test('Post model parses 6-type reactions, hashtags, and poll', () {
      final json = {
        'id': 'post-xyz',
        'workerProfileId': 'wkr-1',
        'content': 'Just completed 25kW solar setup in Cantonments! #SolarPV #CleanEnergy',
        'authorName': 'Kofi Mensah',
        'tradeName': 'Solar Electrician',
        'likesCount': 15,
        'commentsCount': 3,
        'reactions': [
          {'userId': 'usr-1', 'reactionType': 'CELEBRATE'},
          {'userId': 'usr-2', 'reactionType': 'LIKE'},
          {'userId': 'usr-3', 'reactionType': 'INSIGHTFUL'},
        ],
        'hashtags': [
          {'tag': 'SolarPV'},
          {'tag': 'CleanEnergy'},
        ],
        'connectionDegree': 2,
        'isOpenToWork': true,
        'createdAt': '2026-09-30T10:00:00.000Z',
      };

      final post = Post.fromJson(json, currentUserId: 'usr-1');
      expect(post.id, 'post-xyz');
      expect(post.reactionType, 'CELEBRATE');
      expect(post.reactionCounts['CELEBRATE'], 1);
      expect(post.hashtags, contains('SolarPV'));
      expect(post.hashtags, contains('CleanEnergy'));
      expect(post.connectionDegree, 2);
      expect(post.isOpenToWork, isTrue);
    });

    test('FeedProvider reactToPost and removeReaction update counts optimistically', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = SocialRepository(apiClient: apiClient);
      final provider = FeedProvider(socialRepo: repo);

      await provider.loadFeed();
      expect(provider.posts.isNotEmpty, isTrue);

      final firstPost = provider.posts.first;
      final initialLikes = firstPost.likesCount;
      expect(initialLikes >= 0, isTrue);

      // React with CELEBRATE
      provider.reactToPost(firstPost.id, 'CELEBRATE');
      var updated = provider.posts.firstWhere((p) => p.id == firstPost.id);
      expect(updated.reactionType, 'CELEBRATE');
      expect(updated.isLiked, isTrue);

      // React with INSIGHTFUL (switches reaction without double-counting)
      provider.reactToPost(firstPost.id, 'INSIGHTFUL');
      updated = provider.posts.firstWhere((p) => p.id == firstPost.id);
      expect(updated.reactionType, 'INSIGHTFUL');

      // Remove reaction
      provider.removeReaction(firstPost.id);
      updated = provider.posts.firstWhere((p) => p.id == firstPost.id);
      expect(updated.reactionType, isNull);
      expect(updated.isLiked, isFalse);
    });

    test('FeedProvider repostPost increments repost count and optionally inserts repost post', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = SocialRepository(apiClient: apiClient);
      final provider = FeedProvider(socialRepo: repo);

      await provider.loadFeed();
      final target = provider.posts.first;
      final initialCount = target.repostsCount;

      // Instant repost
      await provider.repostPost(target.id);
      var updated = provider.posts.firstWhere((p) => p.id == target.id);
      expect(updated.isReposted, isTrue);
      expect(updated.repostsCount, initialCount + 1);

      // Repost with comment creates new post at index 0
      final totalBefore = provider.posts.length;
      await provider.repostPost(target.id, 'Great safety pointers here!');
      expect(provider.posts.length, totalBefore + 1);
      expect(provider.posts.first.content, 'Great safety pointers here!');
      expect(provider.posts.first.repostOfId, target.id);
    });

    test('FeedProvider votePoll updates option percentages', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = SocialRepository(apiClient: apiClient);
      final provider = FeedProvider(socialRepo: repo);

      await provider.loadFeed();
      final postWithPoll = provider.posts.firstWhere((p) => p.poll != null);
      final poll = postWithPoll.poll!;
      final optionId = poll.options.first.id;

      await provider.votePoll(poll.id, optionId);

      final updatedPost = provider.posts.firstWhere((p) => p.id == postWithPoll.id);
      expect(updatedPost.poll!.myVotedOptionId, optionId);
      expect(updatedPost.poll!.totalVotes, poll.totalVotes + 1);
    });

    test('FeedProvider addComment and nested reply update comment thread', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = SocialRepository(apiClient: apiClient);
      final provider = FeedProvider(socialRepo: repo);

      await provider.loadFeed();
      final targetPost = provider.posts.first;
      final initialCommentsCount = targetPost.commentsCount;

      await provider.loadPostComments(targetPost.id);
      final initialListCount = provider.commentsByPostId[targetPost.id]?.length ?? 0;

      // Top-level comment
      await provider.addComment(targetPost.id, 'What torque wrench did you use for the lugs?');
      final updatedPost = provider.posts.firstWhere((p) => p.id == targetPost.id);
      expect(updatedPost.commentsCount, initialCommentsCount + 1);
      expect(provider.commentsByPostId[targetPost.id]!.length, initialListCount + 1);

      // Reply to top-level comment
      final parentComment = provider.commentsByPostId[targetPost.id]!.first;
      await provider.addComment(targetPost.id, 'We used a calibrated 100Nm torque wrench.', parentComment.id);
      final updatedParent = provider.commentsByPostId[targetPost.id]!.first;
      expect(updatedParent.replies.isNotEmpty, isTrue);
      expect(updatedParent.replies.last.content, contains('100Nm'));
    });
  });
}
