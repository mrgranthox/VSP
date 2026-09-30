import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/network/websocket_client.dart';
import '../../data/models/chat_model.dart';
import '../../data/repositories/chat_repository.dart';

class ChatProvider extends ChangeNotifier {
  final ChatRepository chatRepo;
  final WebSocketClient wsClient;

  ChatRepository get _chatRepo => chatRepo;
  WebSocketClient get _wsClient => wsClient;

  StreamSubscription? _wsSubscription;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<Conversation> _conversations = [];
  List<Conversation> get conversations => _conversations;

  String? _activeConversationId;
  String? get activeConversationId => _activeConversationId;

  List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => _messages;

  final Map<String, bool> _typingIndicators = {};
  Map<String, bool> get typingIndicators => _typingIndicators;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  int get totalUnreadCount =>
      _conversations.fold(0, (sum, item) => sum + item.unreadCount);

  ChatProvider({
    required this.chatRepo,
    required this.wsClient,
  }) {
    loadConversations();
    _listenToWsEvents();
  }

  void setSearchQuery(String q) {
    _searchQuery = q.trim().toLowerCase();
    notifyListeners();
  }

  List<Conversation> get filteredConversations {
    if (_searchQuery.isEmpty) return _conversations;
    return _conversations.where((c) {
      return c.participantName.toLowerCase().contains(_searchQuery) ||
          c.lastMessage.toLowerCase().contains(_searchQuery);
    }).toList();
  }

  void _listenToWsEvents() {
    _wsSubscription = _wsClient.eventsStream.listen((event) {
      final eventName = event['event'] as String?;
      final data = event['data'] as Map<String, dynamic>?;

      if (data == null) return;

      if (eventName == 'chat:message') {
        final convId = data['conversationId'] as String?;
        if (convId != null && convId == _activeConversationId) {
          final msg = ChatMessage.fromJson(data, '');
          _messages.add(msg);
          notifyListeners();
        } else {
          loadConversations();
        }
      } else if (eventName == 'chat:reaction') {
        final messageId = data['messageId'] as String?;
        final emoji = data['emoji'] as String?;
        if (messageId != null && emoji != null) {
          _applyReactionLocally(messageId, emoji);
        }
      } else if (eventName == 'chat:typing') {
        final convId = data['conversationId'] as String?;
        final isTyping = data['isTyping'] as bool? ?? false;
        if (convId != null) {
          _typingIndicators[convId] = isTyping;
          notifyListeners();
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
      markMessagesRead(conversationId);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> sendMessage(
    String text, {
    String? mediaUrl,
    String? replyToId,
    String? replyToName,
    String? replyToContent,
  }) async {
    if (_activeConversationId == null || text.trim().isEmpty) return;

    try {
      final sentMsg = await _chatRepo.sendMessage(
        conversationId: _activeConversationId!,
        content: text.trim(),
        mediaUrl: mediaUrl,
        replyToMessageId: replyToId,
        replyToSenderName: replyToName,
        replyToContent: replyToContent,
      );
      _messages.add(sentMsg);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> sendReaction(String messageId, String emoji) async {
    _applyReactionLocally(messageId, emoji);
    await _chatRepo.sendReaction(messageId, emoji);
  }

  void _applyReactionLocally(String messageId, String emoji) {
    final idx = _messages.indexWhere((m) => m.id == messageId);
    if (idx != -1) {
      final m = _messages[idx];
      final newReactions = Map<String, int>.from(m.reactions);

      if (m.myReaction == emoji) {
        // Toggle off
        if ((newReactions[emoji] ?? 0) > 0) {
          newReactions[emoji] = newReactions[emoji]! - 1;
          if (newReactions[emoji] == 0) newReactions.remove(emoji);
        }
        _messages[idx] = m.copyWith(
          reactions: newReactions,
          clearReaction: true,
        );
      } else {
        // Remove previous reaction if any
        if (m.myReaction != null && (newReactions[m.myReaction!] ?? 0) > 0) {
          newReactions[m.myReaction!] = newReactions[m.myReaction!]! - 1;
          if (newReactions[m.myReaction!] == 0) newReactions.remove(m.myReaction!);
        }
        newReactions[emoji] = (newReactions[emoji] ?? 0) + 1;
        _messages[idx] = m.copyWith(
          reactions: newReactions,
          myReaction: emoji,
        );
      }
      notifyListeners();
    }
  }

  void markMessagesRead(String conversationId) {
    final convIdx = _conversations.indexWhere((c) => c.id == conversationId);
    if (convIdx != -1) {
      _conversations[convIdx] = _conversations[convIdx].copyWith(unreadCount: 0);
      notifyListeners();
    }
    _chatRepo.markConversationRead(conversationId);
  }

  void sendTyping(String conversationId, bool isTyping) {
    _chatRepo.sendTyping(conversationId, isTyping);
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}
