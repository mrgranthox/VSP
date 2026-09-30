import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/chat_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/empty_state_view.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  bool _filterOnlyUnread = false;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    final conversations = chat.filteredConversations.where((c) {
      if (_filterOnlyUnread) return c.unreadCount > 0;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Trade Messages',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_square, color: AppColors.brand),
            tooltip: 'New Message',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Select a craftsman from My Network to start a chat')),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => chat.loadConversations(),
        color: AppColors.brand,
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.screenBg,
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  border: Border.all(color: AppColors.border),
                ),
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (q) => chat.setSearchQuery(q),
                  decoration: InputDecoration(
                    hintText: 'Search conversations or messages...',
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.midText),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchCtrl.clear();
                              chat.setSearchQuery('');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),

            // Filter Tabs (All / Unread)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('All Messages'),
                    selected: !_filterOnlyUnread,
                    onSelected: (selected) {
                      if (selected) setState(() => _filterOnlyUnread = false);
                    },
                    selectedColor: AppColors.brand,
                    labelStyle: TextStyle(
                      color: !_filterOnlyUnread ? Colors.white : AppColors.darkText,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Unread'),
                        if (chat.totalUnreadCount > 0) ...[
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: _filterOnlyUnread ? Colors.white : AppColors.brand,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${chat.totalUnreadCount}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: _filterOnlyUnread ? AppColors.brand : Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    selected: _filterOnlyUnread,
                    onSelected: (selected) {
                      if (selected) setState(() => _filterOnlyUnread = true);
                    },
                    selectedColor: AppColors.brand,
                    labelStyle: TextStyle(
                      color: _filterOnlyUnread ? Colors.white : AppColors.darkText,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Conversations List
            Expanded(
              child: chat.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : conversations.isEmpty
                      ? const EmptyStateView(
                          icon: Icons.chat_bubble_outline_rounded,
                          title: 'No conversations found',
                          message:
                              'When you inquire or coordinate on bookings, your discussions with craftsmen appear here.',
                        )
                      : ListView.separated(
                          itemCount: conversations.length,
                          separatorBuilder: (_, _) => const Divider(
                            height: 1,
                            indent: 76,
                            color: AppColors.borderLight,
                          ),
                          itemBuilder: (context, index) {
                            final conv = conversations[index];
                            final timeStr = DateFormat('h:mm a').format(conv.lastMessageTime);
                            final isTyping = chat.typingIndicators[conv.id] ?? false;

                            return InkWell(
                              onTap: () {
                                chat.openConversation(conv.id);
                                context.push(
                                    '/chat/${conv.id}?name=${Uri.encodeComponent(conv.participantName)}');
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
                                                  isTyping ? 'typing...' : conv.lastMessage,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: isTyping || conv.unreadCount > 0
                                                        ? FontWeight.w700
                                                        : FontWeight.w400,
                                                    color: isTyping
                                                        ? AppColors.brand
                                                        : (conv.unreadCount > 0
                                                            ? AppColors.darkText
                                                            : AppColors.midText),
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              if (conv.unreadCount > 0) ...[
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(
                                                      horizontal: 7, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.brand,
                                                    borderRadius: BorderRadius.circular(10),
                                                  ),
                                                  child: Text(
                                                    '${conv.unreadCount}',
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w800,
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
          ],
        ),
      ),
    );
  }
}
