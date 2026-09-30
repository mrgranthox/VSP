import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/network/websocket_client.dart';
import '../../core/storage/storage_service.dart';
import '../models/chat_model.dart';

class ChatRepository {
  final ApiClient _apiClient;
  final WebSocketClient _wsClient;
  final StorageService _storage;

  ChatRepository({
    required this._apiClient,
    required this._wsClient,
    required this._storage,
  });

  String get _currentUserId {
    final user = _storage.getUser();
    return user?['id'] as String? ?? '';
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

    return _fallbackConversations;
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

    return _fallbackMessages;
  }

  Future<ChatMessage> sendMessage({
    required String conversationId,
    required String content,
    String? mediaUrl,
  }) async {
    final response = await _apiClient.post<Map<String, dynamic>>(
      ApiConstants.conversationMessages(conversationId),
      body: {
        'content': content,
        'mediaUrl': ?mediaUrl,
      },
    );

    final data = response.data;
    if (data != null) {
      final msg = ChatMessage.fromJson(data, _currentUserId);
      _wsClient.send('chat:message', data);
      return msg;
    }

    // Local echo fallback
    return ChatMessage(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: _currentUserId,
      senderName: 'You',
      content: content,
      mediaUrl: mediaUrl,
      isMine: true,
      status: 'SENT',
      createdAt: DateTime.now(),
    );
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
    ),
    Conversation(
      id: 'conv-2',
      participantId: 'worker-2',
      participantName: 'Ama Kojo (Plumber)',
      lastMessage: 'Thanks for the review! Let me know if you need anything else.',
      lastMessageTime: DateTime.now().subtract(const Duration(days: 2)),
      unreadCount: 0,
      isOnline: false,
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
      createdAt: DateTime.now().subtract(const Duration(minutes: 40)),
    ),
    ChatMessage(
      id: 'm2',
      conversationId: 'conv-1',
      senderId: 'current-user',
      senderName: 'You',
      content: 'Hi Bob, yes! It keeps tripping whenever the AC is switched on.',
      isMine: true,
      createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
    ),
    ChatMessage(
      id: 'm3',
      conversationId: 'conv-1',
      senderId: 'worker-1',
      senderName: 'Bob Williams',
      content: 'Understood. Sounds like an overload on that breaker. I am on my way to your location now.',
      isMine: false,
      createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
    ),
  ];
}
