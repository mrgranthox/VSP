import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'reaction_picker.dart';

class ReactionCountRow extends StatelessWidget {
  final Map<String, int> reactionCounts;
  final int totalCount;
  final VoidCallback? onTap;

  const ReactionCountRow({
    super.key,
    required this.reactionCounts,
    required this.totalCount,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (totalCount <= 0) return const SizedBox.shrink();

    // Pick top 3 reaction types with count > 0
    final activeReactions = kReactions
        .where((r) => (reactionCounts[r.type] ?? 0) > 0)
        .take(3)
        .toList();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (activeReactions.isNotEmpty)
              SizedBox(
                height: 20,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (int i = 0; i < activeReactions.length; i++)
                      Transform.translate(
                        offset: Offset(-4.0 * i, 0),
                        child: Container(
                          padding: const EdgeInsets.all(1),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            activeReactions[i].emoji,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      ),
                  ],
                ),
              )
            else
              const Text('👍', style: TextStyle(fontSize: 13)),
            const SizedBox(width: 4),
            Text(
              '$totalCount',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.midText,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
