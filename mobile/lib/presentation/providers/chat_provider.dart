import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/network/websocket_client.dart';
import '../../data/models/chat_model.dart';
import '../../data/repositories/chat_repository.dart';

class ChatProvider extends ChangeNotifier {
  final ChatRepository _chatRepo;
  final WebSocketClient _wsClient;
  StreamSubscription? _wsSubscription;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<Conversation> _conversations = [];
  List<Conversation> get conversations => _conversations;

  String? _activeConversationId;
  String? get activeConversationId => _activeConversationId;

  List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => _messages;

  int get totalUnreadCount =>
      _conversations.fold(0, (sum, item) => sum + item.unreadCount);

  ChatProvider({
    required this._chatRepo,
    required this._wsClient,
  }) {
    loadConversations();
    _listenToWsEvents();
  }

  void _listenToWsEvents() {
    _wsSubscription = _wsClient.eventsStream.listen((event) {
      final eventName = event['event'] as String?;
      final data = event['data'] as Map<String, dynamic>?;

      if (eventName == 'chat:message' && data != null) {
        final convId = data['conversationId'] as String?;
        if (convId != null && convId == _activeConversationId) {
          // If in active room, append message
          final msg = ChatMessage.fromJson(data, '');
          _messages.add(msg);
          notifyListeners();
        } else {
          // Update conversation badge
          loadConversations();
        }
      }
    });
  }

  Future<void> loadConversations() async {
    _isLoading = true;
    notifyListeners();

    try {
      _conversations = await _chatRepo.getConversations();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> openConversation(String conversationId) async {
    if (_activeConversationId != null) {
      _chatRepo.leaveChatRoom(_activeConversationId!);
    }

    _activeConversationId = conversationId;
    _chatRepo.joinChatRoom(conversationId);

    _isLoading = true;
    notifyListeners();

    try {
      _messages = await _chatRepo.getMessages(conversationId);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> sendMessage(String text, [String? mediaUrl]) async {
    if (_activeConversationId == null || text.trim().isEmpty) return;

    try {
      final sentMsg = await _chatRepo.sendMessage(
        conversationId: _activeConversationId!,
        content: text.trim(),
        mediaUrl: mediaUrl,
      );
      _messages.add(sentMsg);
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}
