import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/network/websocket_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/models/chat_model.dart';
import 'package:vsp_mobile/data/repositories/chat_repository.dart';
import 'package:vsp_mobile/presentation/providers/chat_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Sprint C: Chat & Real-Time Inbox Tests', () {
    test('ChatMessage parses reactions and reply-to message metadata', () {
      final json = {
        'id': 'msg-101',
        'conversationId': 'conv-1',
        'senderId': 'worker-1',
        'content': 'I have arrived on site and started diagnosing the breaker.',
        'status': 'READ',
        'replyTo': {
          'id': 'msg-100',
          'content': 'Please let me know when you reach.',
          'sender': {
            'profile': {'fullName': 'You'}
          }
        },
        'reactions': [
          {'userId': 'worker-1', 'emoji': '👍'},
          {'userId': 'current-user', 'emoji': '❤️'},
        ],
        'createdAt': '2026-09-30T11:00:00.000Z',
      };

      final msg = ChatMessage.fromJson(json, 'current-user');
      expect(msg.id, 'msg-101');
      expect(msg.status, 'READ');
      expect(msg.replyToMessageId, 'msg-100');
      expect(msg.replyToSenderName, 'You');
      expect(msg.replyToContent, 'Please let me know when you reach.');
      expect(msg.reactions['👍'], 1);
      expect(msg.reactions['❤️'], 1);
      expect(msg.myReaction, '❤️');
    });

    test('ChatProvider search query filters conversations correctly', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final wsClient = WebSocketClient(storage: storage);
      final repo = ChatRepository(apiClient: apiClient, wsClient: wsClient, storage: storage);
      final provider = ChatProvider(chatRepo: repo, wsClient: wsClient);

      await provider.loadConversations();
      expect(provider.conversations.isNotEmpty, isTrue);

      provider.setSearchQuery('Plumber');
      expect(provider.filteredConversations.length, 1);
      expect(provider.filteredConversations.first.participantName, contains('Plumber'));

      provider.setSearchQuery('non-existent craftsman');
      expect(provider.filteredConversations.isEmpty, isTrue);

      provider.setSearchQuery('');
      expect(provider.filteredConversations.length, provider.conversations.length);
    });

    test('ChatProvider sendReaction applies reaction and toggles off correctly', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final wsClient = WebSocketClient(storage: storage);
      final repo = ChatRepository(apiClient: apiClient, wsClient: wsClient, storage: storage);
      final provider = ChatProvider(chatRepo: repo, wsClient: wsClient);

      await provider.openConversation('conv-1');
      expect(provider.messages.isNotEmpty, isTrue);

      final msgId = provider.messages.first.id;

      // Add reaction
      await provider.sendReaction(msgId, '💡');
      var updated = provider.messages.firstWhere((m) => m.id == msgId);
      expect(updated.reactions['💡'], 1);
      expect(updated.myReaction, '💡');

      // Tap same reaction again -> toggles off
      await provider.sendReaction(msgId, '💡');
      updated = provider.messages.firstWhere((m) => m.id == msgId);
      expect(updated.reactions['💡'], isNull);
      expect(updated.myReaction, isNull);
    });

    test('ChatProvider sendMessage with reply sends quoted context', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final wsClient = WebSocketClient(storage: storage);
      final repo = ChatRepository(apiClient: apiClient, wsClient: wsClient, storage: storage);
      final provider = ChatProvider(chatRepo: repo, wsClient: wsClient);

      await provider.openConversation('conv-1');
      final beforeCount = provider.messages.length;

      await provider.sendMessage(
        'Sounds good, see you at the gate.',
        replyToId: 'm1',
        replyToName: 'Bob Williams',
        replyToContent: 'Hello! I received your booking request.',
      );

      expect(provider.messages.length, beforeCount + 1);
      final sent = provider.messages.last;
      expect(sent.replyToMessageId, 'm1');
      expect(sent.replyToSenderName, 'Bob Williams');
      expect(sent.replyToContent, 'Hello! I received your booking request.');
    });

    test('ChatProvider markMessagesRead clears conversation unreadCount', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final wsClient = WebSocketClient(storage: storage);
      final repo = ChatRepository(apiClient: apiClient, wsClient: wsClient, storage: storage);
      final provider = ChatProvider(chatRepo: repo, wsClient: wsClient);

      await provider.loadConversations();
      final target = provider.conversations.firstWhere((c) => c.unreadCount > 0);

      provider.markMessagesRead(target.id);
      final updated = provider.conversations.firstWhere((c) => c.id == target.id);
      expect(updated.unreadCount, 0);
    });
  });
}
