import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/chat_model.dart';
import '../../providers/chat_provider.dart';
import '../../widgets/avatar_badge.dart';

class ChatConversationScreen extends StatefulWidget {
  final String conversationId;
  final String? participantName;

  const ChatConversationScreen({
    super.key,
    required this.conversationId,
    this.participantName,
  });

  @override
  State<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends State<ChatConversationScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  ChatMessage? _replyingToMessage;

  final List<String> _quickEmojis = ['👍', '❤️', '👏', '💡', '😂', '😮'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().openConversation(widget.conversationId);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final chat = context.read<ChatProvider>();
    chat.sendMessage(
      text,
      replyToId: _replyingToMessage?.id,
      replyToName: _replyingToMessage?.senderName,
      replyToContent: _replyingToMessage?.content,
    );

    _messageController.clear();
    setState(() => _replyingToMessage = null);

    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showReactionMenu(ChatMessage msg) {
    HapticFeedback.mediumImpact();
    showDialog(
      context: context,
      barrierColor: Colors.black26,
      builder: (ctx) => Center(
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.18),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final emoji in _quickEmojis)
                  InkWell(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.pop(ctx);
                      context.read<ChatProvider>().sendReaction(msg.id, emoji);
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Text(emoji, style: const TextStyle(fontSize: 26)),
                    ),
                  ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.reply, size: 20, color: AppColors.midText),
                  tooltip: 'Reply to message',
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() => _replyingToMessage = msg);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTicks(String status) {
    if (status == 'READ') {
      return const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.done_all, size: 13, color: Colors.lightBlueAccent),
        ],
      );
    }
    if (status == 'DELIVERED') {
      return const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.done_all, size: 13, color: Colors.white70),
        ],
      );
    }
    return const Icon(Icons.done, size: 13, color: Colors.white70);
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    final title = widget.participantName ?? 'Conversation';
    final isTyping = chat.typingIndicators[widget.conversationId] ?? false;

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Row(
          children: [
            AvatarBadge(name: title, size: 38, isOnline: true),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.darkText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    isTyping ? 'typing...' : 'Active in trade network',
                    style: TextStyle(
                      fontSize: 11,
                      color: isTyping ? AppColors.brand : AppColors.success,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.phone_outlined),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Starting trade voice call...')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.videocam_outlined),
            onPressed: () => context.push('/call/${widget.conversationId}'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Message bubbles list
            Expanded(
              child: chat.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      itemCount: chat.messages.length + (isTyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == chat.messages.length && isTyping) {
                          // Typing bubble
                          return Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'typing',
                                    style: TextStyle(fontSize: 12, color: AppColors.midText),
                                  ),
                                  SizedBox(width: 4),
                                  SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }

                        final msg = chat.messages[index];
                        final timeStr = DateFormat('h:mm a').format(msg.createdAt);

                        return GestureDetector(
                          onLongPress: () => _showReactionMenu(msg),
                          child: Align(
                            alignment: msg.isMine ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.78,
                              ),
                              child: Column(
                                crossAxisAlignment:
                                    msg.isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  // Quoted reply card
                                  if (msg.replyToContent != null)
                                    Container(
                                      margin: const EdgeInsets.only(bottom: 2),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: msg.isMine
                                            ? AppColors.brandDark
                                            : AppColors.screenBg,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border(
                                          left: BorderSide(
                                            color: msg.isMine ? Colors.white70 : AppColors.brand,
                                            width: 3,
                                          ),
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            msg.replyToSenderName ?? 'Reply',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: msg.isMine ? Colors.white : AppColors.brandDark,
                                            ),
                                          ),
                                          Text(
                                            msg.replyToContent!,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: msg.isMine ? Colors.white70 : AppColors.midText,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                  // Bubble
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: msg.isMine ? AppColors.brand : Colors.white,
                                      borderRadius: BorderRadius.only(
                                        topLeft: const Radius.circular(16),
                                        topRight: const Radius.circular(16),
                                        bottomLeft: Radius.circular(msg.isMine ? 16 : 4),
                                        bottomRight: Radius.circular(msg.isMine ? 4 : 16),
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 4,
                                          offset: const Offset(0, 1),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: msg.isMine
                                          ? CrossAxisAlignment.end
                                          : CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          msg.content,
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: msg.isMine ? Colors.white : AppColors.darkText,
                                            height: 1.4,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              timeStr,
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: msg.isMine
                                                    ? Colors.white.withValues(alpha: 0.7)
                                                    : AppColors.lightText,
                                              ),
                                            ),
                                            if (msg.isMine) ...[
                                              const SizedBox(width: 4),
                                              _buildStatusTicks(msg.status),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Reactions row
                                  if (msg.reactions.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Wrap(
                                        spacing: 4,
                                        children: msg.reactions.entries.map((entry) {
                                          final isMyReact = msg.myReaction == entry.key;
                                          return InkWell(
                                            onTap: () {
                                              context.read<ChatProvider>().sendReaction(msg.id, entry.key);
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isMyReact ? AppColors.brandLight : Colors.white,
                                                borderRadius: BorderRadius.circular(12),
                                                border: Border.all(
                                                  color: isMyReact ? AppColors.brand : AppColors.border,
                                                  width: 1,
                                                ),
                                              ),
                                              child: Text(
                                                '${entry.key} ${entry.value}',
                                                style: const TextStyle(fontSize: 11),
                                              ),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),

            // Inline Reply Preview Banner
            if (_replyingToMessage != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: AppColors.brandLight.withValues(alpha: 0.6),
                child: Row(
                  children: [
                    const Icon(Icons.reply, size: 18, color: AppColors.brandDark),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Replying to ${_replyingToMessage!.senderName}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.brandDark,
                            ),
                          ),
                          Text(
                            _replyingToMessage!.content,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.midText),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => setState(() => _replyingToMessage = null),
                    ),
                  ],
                ),
              ),

            // Message Composer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: AppColors.borderLight, width: 1),
                ),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file_rounded, color: AppColors.midText),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Attach project photo or blueprint')),
                      );
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Type your message...',
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: AppColors.brand),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
