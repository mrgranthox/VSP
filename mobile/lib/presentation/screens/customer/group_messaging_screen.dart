import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/reaction_picker.dart';

class GroupChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String senderTrade;
  final String? senderAvatarUrl;
  final String text;
  final DateTime sentAt;
  final bool isMe;
  final String? replyToText;
  final String? replyToAuthor;
  final Map<String, int> reactions;
  final String? myReaction;

  GroupChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderTrade,
    this.senderAvatarUrl,
    required this.text,
    required this.sentAt,
    required this.isMe,
    this.replyToText,
    this.replyToAuthor,
    this.reactions = const {},
    this.myReaction,
  });

  GroupChatMessage copyWith({
    Map<String, int>? reactions,
    String? myReaction,
    bool clearReaction = false,
  }) {
    return GroupChatMessage(
      id: id,
      senderId: senderId,
      senderName: senderName,
      senderTrade: senderTrade,
      senderAvatarUrl: senderAvatarUrl,
      text: text,
      sentAt: sentAt,
      isMe: isMe,
      replyToText: replyToText,
      replyToAuthor: replyToAuthor,
      reactions: reactions ?? this.reactions,
      myReaction: clearReaction ? null : (myReaction ?? this.myReaction),
    );
  }
}

class GroupMessagingScreen extends StatefulWidget {
  final String groupId;

  const GroupMessagingScreen({super.key, required this.groupId});

  @override
  State<GroupMessagingScreen> createState() => _GroupMessagingScreenState();
}

class _GroupMessagingScreenState extends State<GroupMessagingScreen> {
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  GroupChatMessage? _replyingTo;

  late String _groupTitle;
  late int _memberCount;
  late List<GroupChatMessage> _messages;

  @override
  void initState() {
    super.initState();
    _groupTitle = 'Industrial Electricians & Automation Guild';
    _memberCount = 1420;

    _messages = [
      GroupChatMessage(
        id: 'gm-1',
        senderId: 'u-10',
        senderName: 'Marcus Vance',
        senderTrade: 'Master Electrician',
        text: 'Heads up everyone on NEC 2024 Article 210.8 GFCI requirements for commercial kitchens—inspectors in District 4 are cracking down on hardwired equipment.',
        sentAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 15)),
        isMe: false,
        reactions: {'👍': 12, '💡': 8},
      ),
      GroupChatMessage(
        id: 'gm-2',
        senderId: 'u-11',
        senderName: 'Dave Kowalski',
        senderTrade: 'PLC Programmer',
        text: 'Good to know Marcus! Are they requiring GFCI protection on existing 3-phase receptacle retrofits as well?',
        sentAt: DateTime.now().subtract(const Duration(hours: 1, minutes: 40)),
        isMe: false,
        replyToAuthor: 'Marcus Vance',
        replyToText: 'Heads up everyone on NEC 2024 Article 210.8...',
        reactions: {'👍': 3},
      ),
      GroupChatMessage(
        id: 'gm-3',
        senderId: 'u-self',
        senderName: 'You',
        senderTrade: 'Journeyman Electrician',
        text: 'Only if the branch circuit is modified or extended more than 6 feet per local amendment. We had an inspection pass on Wednesday with that clarification.',
        sentAt: DateTime.now().subtract(const Duration(minutes: 25)),
        isMe: true,
        reactions: {'👏': 5, '❤️': 2},
      ),
    ];
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;

    final newMsg = GroupChatMessage(
      id: 'gm-${DateTime.now().millisecondsSinceEpoch}',
      senderId: 'u-self',
      senderName: 'You',
      senderTrade: 'Journeyman Electrician',
      text: text,
      sentAt: DateTime.now(),
      isMe: true,
      replyToAuthor: _replyingTo?.senderName,
      replyToText: _replyingTo?.text,
    );

    setState(() {
      _messages.add(newMsg);
      _replyingTo = null;
    });

    _msgCtrl.clear();
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _handleReaction(GroupChatMessage msg, String emoji) {
    setState(() {
      final index = _messages.indexWhere((m) => m.id == msg.id);
      if (index == -1) return;

      final currentMsg = _messages[index];
      final currentMap = Map<String, int>.from(currentMsg.reactions);

      if (currentMsg.myReaction == emoji) {
        // Remove reaction
        final count = (currentMap[emoji] ?? 1) - 1;
        if (count <= 0) {
          currentMap.remove(emoji);
        } else {
          currentMap[emoji] = count;
        }
        _messages[index] = currentMsg.copyWith(
          reactions: currentMap,
          clearReaction: true,
        );
      } else {
        // Change or add reaction
        if (currentMsg.myReaction != null) {
          final oldCount = (currentMap[currentMsg.myReaction!] ?? 1) - 1;
          if (oldCount <= 0) {
            currentMap.remove(currentMsg.myReaction!);
          } else {
            currentMap[currentMsg.myReaction!] = oldCount;
          }
        }
        currentMap[emoji] = (currentMap[emoji] ?? 0) + 1;
        _messages[index] = currentMsg.copyWith(
          reactions: currentMap,
          myReaction: emoji,
        );
      }
    });
  }

  void _showGroupDetails() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLg)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.brandLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.bolt, color: AppColors.brand, size: 28),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_groupTitle, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text('$_memberCount verified trade professionals',
                          style: const TextStyle(color: AppColors.midText, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Guild Description',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            const SizedBox(height: 4),
            const Text(
              'Peer exchange for industrial sparkies, control technicians, and automation integrators. Share code updates, wiring schematics, safety protocols, and sub-contracting opportunities.',
              style: TextStyle(color: AppColors.midText, fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.notifications_off_outlined),
              title: const Text('Mute Group Notifications', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              trailing: Switch(value: false, onChanged: (_) {}, activeThumbColor: AppColors.brand),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        title: InkWell(
          onTap: _showGroupDetails,
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.brandLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.bolt, color: AppColors.brand, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _groupTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    Text(
                      '$_memberCount members • 14 active now',
                      style: const TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: _showGroupDetails,
          ),
        ],
      ),
      body: Column(
        children: [
          // Guild Code Notice Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            color: AppColors.brandLight.withValues(alpha: 0.5),
            child: Row(
              children: const [
                Icon(Icons.verified_outlined, size: 14, color: AppColors.brand),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'All messages must comply with National Electrical Code & OSHA safety standards.',
                    style: TextStyle(fontSize: 11, color: AppColors.brand, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Message list
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessageTile(msg);
              },
            ),
          ),

          // Replying banner
          if (_replyingTo != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.white,
              child: Row(
                children: [
                  Container(width: 3, height: 28, color: AppColors.brand),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Replying to ${_replyingTo!.senderName}',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: AppColors.brand)),
                        Text(_replyingTo!.text,
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.midText)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () => setState(() => _replyingTo = null),
                  ),
                ],
              ),
            ),

          // Input bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.add_photo_alternate_outlined, color: AppColors.midText),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Photo & schematic uploads available in group chat.')),
                      );
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      maxLines: 4,
                      minLines: 1,
                      decoration: InputDecoration(
                        hintText: 'Discuss trade techniques or ask guild members...',
                        hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                        filled: true,
                        fillColor: const Color(0xFFF9FAFB),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.brand,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageTile(GroupChatMessage msg) {
    final timeStr = DateFormat('h:mm a').format(msg.sentAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: msg.isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!msg.isMe) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: AppColors.brandLight,
              child: Text(
                msg.senderName.substring(0, 1),
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brand, fontSize: 13),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: msg.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!msg.isMe) ...[
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        msg.senderName,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5E7EB),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          msg.senderTrade,
                          style: const TextStyle(fontSize: 10, color: AppColors.midText, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                ],

                // Quoted reply
                if (msg.replyToText != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 4),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E7EB).withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                      border: const Border(left: BorderSide(color: AppColors.brand, width: 2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(msg.replyToAuthor ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 10, color: AppColors.brand)),
                        Text(msg.replyToText!,
                            maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 10, color: AppColors.midText)),
                      ],
                    ),
                  ),

                // Message bubble
                GestureDetector(
                  onLongPress: () async {
                    final emoji = await ReactionPicker.show(context);
                    if (emoji != null) {
                      _handleReaction(msg, emoji);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: msg.isMe ? AppColors.brand : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(14),
                        topRight: const Radius.circular(14),
                        bottomLeft: Radius.circular(msg.isMe ? 14 : 2),
                        bottomRight: Radius.circular(msg.isMe ? 2 : 14),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                        color: msg.isMe ? Colors.white : AppColors.darkText,
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 3),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(timeStr, style: const TextStyle(fontSize: 10, color: AppColors.midText)),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () => setState(() => _replyingTo = msg),
                      child: const Text('Reply', style: TextStyle(fontSize: 10, color: AppColors.brand, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),

                // Reaction summary row
                if (msg.reactions.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    children: msg.reactions.entries.map((entry) {
                      final isMine = msg.myReaction == entry.key;
                      return InkWell(
                        onTap: () => _handleReaction(msg, entry.key),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isMine ? AppColors.brandLight : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isMine ? AppColors.brand : AppColors.border,
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
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
