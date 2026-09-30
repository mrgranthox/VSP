import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/network/websocket_client.dart';
import '../../core/storage/storage_service.dart';
import '../models/chat_model.dart';

class ChatRepository {
  final ApiClient apiClient;
  final WebSocketClient wsClient;
  final StorageService storage;

  ApiClient get _apiClient => apiClient;
  WebSocketClient get _wsClient => wsClient;
  StorageService get _storage => storage;

  ChatRepository({
    required this.apiClient,
    required this.wsClient,
    required this.storage,
  });

  String get _currentUserId {
    final user = _storage.getUser();
    return user?['id'] as String? ?? 'current-user';
  }

  Future<List<Conversation>> getConversations() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.conversations,
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => Conversation.fromJson(e as Map<String, dynamic>, _currentUserId))
            .toList();
      }
    } catch (_) {}

    return _fallbackConversations.map((c) => c.copyWith()).toList();
  }

  Future<List<ChatMessage>> getMessages(
    String conversationId, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.conversationMessages(conversationId),
        queryParams: {'page': page, 'limit': limit},
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>, _currentUserId))
            .toList();
      }
    } catch (_) {}

    return _fallbackMessages.map((m) => m.copyWith()).toList();
  }

  Future<ChatMessage> sendMessage({
    required String conversationId,
    required String content,
    String? mediaUrl,
    String? replyToMessageId,
    String? replyToSenderName,
    String? replyToContent,
  }) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        ApiConstants.conversationMessages(conversationId),
        body: {
          'content': content,
          'mediaUrl': ?mediaUrl,
          'replyToMessageId': ?replyToMessageId,
        },
      );

      final data = response.data;
      if (data != null) {
        final msg = ChatMessage.fromJson(data, _currentUserId);
        _wsClient.send('chat:message', data);
        return msg;
      }
    } catch (_) {}

    // Local echo fallback
    return ChatMessage(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: _currentUserId,
      senderName: 'You',
      content: content,
      mediaUrl: mediaUrl,
      replyToMessageId: replyToMessageId,
      replyToSenderName: replyToSenderName,
      replyToContent: replyToContent,
      isMine: true,
      status: 'SENT',
      createdAt: DateTime.now(),
    );
  }

  Future<void> sendReaction(String messageId, String emoji) async {
    try {
      await _apiClient.post(
        '/chat/messages/$messageId/reactions',
        body: {'emoji': emoji},
      );
      _wsClient.send('chat:reaction', {'messageId': messageId, 'emoji': emoji});
    } catch (_) {}
  }

  Future<void> removeReaction(String messageId, String emoji) async {
    try {
      await _apiClient.delete(
        '/chat/messages/$messageId/reactions',
        body: {'emoji': emoji},
      );
    } catch (_) {}
  }

  Future<void> markConversationRead(String conversationId) async {
    try {
      await _apiClient.post('/chat/conversations/$conversationId/read');
    } catch (_) {}
  }

  void sendTyping(String conversationId, bool isTyping) {
    _wsClient.send('chat:typing', {
      'conversationId': conversationId,
      'isTyping': isTyping,
    });
  }

  void joinChatRoom(String conversationId) {
    _wsClient.joinRoom('chat:conv:$conversationId');
  }

  void leaveChatRoom(String conversationId) {
    _wsClient.leaveRoom('chat:conv:$conversationId');
  }

  static final List<Conversation> _fallbackConversations = [
    Conversation(
      id: 'conv-1',
      participantId: 'worker-1',
      participantName: 'Bob Williams (Electrician)',
      lastMessage: 'I am on my way to your location now.',
      lastMessageTime: DateTime.now().subtract(const Duration(minutes: 15)),
      unreadCount: 1,
      isOnline: true,
      isTyping: false,
    ),
    Conversation(
      id: 'conv-2',
      participantId: 'worker-2',
      participantName: 'Ama Kojo (Plumber)',
      lastMessage: 'Thanks for the review! Let me know if you need anything else.',
      lastMessageTime: DateTime.now().subtract(const Duration(days: 2)),
      unreadCount: 0,
      isOnline: false,
      isTyping: false,
    ),
  ];

  static final List<ChatMessage> _fallbackMessages = [
    ChatMessage(
      id: 'm1',
      conversationId: 'conv-1',
      senderId: 'worker-1',
      senderName: 'Bob Williams',
      content: 'Hello! I received your booking request for the fuse box inspection.',
      isMine: false,
      status: 'READ',
      createdAt: DateTime.now().subtract(const Duration(minutes: 40)),
      reactions: {'👍': 1},
    ),
    ChatMessage(
      id: 'm2',
      conversationId: 'conv-1',
      senderId: 'current-user',
      senderName: 'You',
      content: 'Hi Bob, yes! It keeps tripping whenever the AC is switched on.',
      isMine: true,
      status: 'READ',
      createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
    ),
    ChatMessage(
      id: 'm3',
      conversationId: 'conv-1',
      senderId: 'worker-1',
      senderName: 'Bob Williams',
      content: 'Understood. Sounds like an overload on that breaker. I am on my way to your location now.',
      replyToMessageId: 'm2',
      replyToSenderName: 'You',
      replyToContent: 'Hi Bob, yes! It keeps tripping whenever the AC is switched on.',
      isMine: false,
      status: 'READ',
      createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
      reactions: {'🤝': 1, '👍': 1},
    ),
  ];
}
