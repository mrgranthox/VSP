import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/chat_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/empty_state_view.dart';

class InboxScreen extends StatelessWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Messages'),
      ),
      body: RefreshIndicator(
        onRefresh: () => chat.loadConversations(),
        color: AppColors.brand,
        child: chat.isLoading
            ? const Center(child: CircularProgressIndicator())
            : chat.conversations.isEmpty
                ? const EmptyStateView(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'No conversations yet',
                    message:
                        'When you book a worker or send an inquiry, your messages will appear here.',
                  )
                : ListView.separated(
                    itemCount: chat.conversations.length,
                    separatorBuilder: (_, _) => const Divider(
                      height: 1,
                      indent: 76,
                      color: AppColors.borderLight,
                    ),
                    itemBuilder: (context, index) {
                      final conv = chat.conversations[index];
                      final timeStr = DateFormat('h:mm a').format(conv.lastMessageTime);

                      return InkWell(
                        onTap: () {
                          chat.openConversation(conv.id);
                          context.push('/chat/${conv.id}?name=${Uri.encodeComponent(conv.participantName)}');
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              AvatarBadge(
                                name: conv.participantName,
                                size: 48,
                                isOnline: conv.isOnline,
                                gradient: AppColors.avatarGradient1,
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            conv.participantName,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.darkText,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Text(
                                          timeStr,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.lightText,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            conv.lastMessage,
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: conv.unreadCount > 0
                                                  ? AppColors.darkText
                                                  : AppColors.midText,
                                              fontWeight: conv.unreadCount > 0
                                                  ? FontWeight.w700
                                                  : FontWeight.w400,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (conv.unreadCount > 0) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.brand,
                                              borderRadius: BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              '${conv.unreadCount}',
                                              style: const TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
