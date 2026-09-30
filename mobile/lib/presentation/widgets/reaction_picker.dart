import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';

class ReactionItemData {
  final String type;
  final String emoji;
  final String label;
  final Color color;

  const ReactionItemData({
    required this.type,
    required this.emoji,
    required this.label,
    required this.color,
  });
}

const List<ReactionItemData> kReactions = [
  ReactionItemData(type: 'LIKE', emoji: '👍', label: 'Like', color: AppColors.brand),
  ReactionItemData(type: 'CELEBRATE', emoji: '🎉', label: 'Celebrate', color: Color(0xFF10B981)),
  ReactionItemData(type: 'LOVE', emoji: '❤️', label: 'Love', color: Color(0xFFEF4444)),
  ReactionItemData(type: 'INSIGHTFUL', emoji: '💡', label: 'Insightful', color: Color(0xFFF59E0B)),
  ReactionItemData(type: 'SUPPORT', emoji: '🤝', label: 'Support', color: Color(0xFF8B5CF6)),
  ReactionItemData(type: 'FUNNY', emoji: '😄', label: 'Funny', color: Color(0xFF06B6D4)),
];

/// A floating reaction picker popover inspired by LinkedIn
class ReactionPicker extends StatelessWidget {
  final ValueChanged<String> onSelect;
  final VoidCallback? onDismiss;

  const ReactionPicker({
    super.key,
    required this.onSelect,
    this.onDismiss,
  });

  static Future<String?> show(BuildContext context) {
    HapticFeedback.mediumImpact();
    return showDialog<String>(
      context: context,
      barrierColor: Colors.black26,
      builder: (ctx) => Center(
        child: Material(
          color: Colors.transparent,
          child: ReactionPicker(
            onSelect: (type) => Navigator.of(ctx).pop(type),
            onDismiss: () => Navigator.of(ctx).pop(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: kReactions.map((r) => _ReactionButton(item: r, onSelect: onSelect)).toList(),
      ),
    );
  }
}

class _ReactionButton extends StatefulWidget {
  final ReactionItemData item;
  final ValueChanged<String> onSelect;

  const _ReactionButton({required this.item, required this.onSelect});

  @override
  State<_ReactionButton> createState() => _ReactionButtonState();
}

class _ReactionButtonState extends State<_ReactionButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onSelect(widget.item.type);
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: AnimatedScale(
          scale: _isHovered ? 1.35 : 1.0,
          duration: const Duration(milliseconds: 120),
          curve: Curves.easeOutBack,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            child: Tooltip(
              message: widget.item.label,
              child: Text(
                widget.item.emoji,
                style: const TextStyle(fontSize: 26),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
