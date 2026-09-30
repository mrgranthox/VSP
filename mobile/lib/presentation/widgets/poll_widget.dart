import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class PollOptionData {
  final String id;
  final String label;
  final int votesCount;
  final double percentage;

  const PollOptionData({
    required this.id,
    required this.label,
    required this.votesCount,
    required this.percentage,
  });
}

class PollData {
  final String id;
  final String question;
  final List<PollOptionData> options;
  final int totalVotes;
  final String? myVotedOptionId;
  final bool isClosed;
  final DateTime? endsAt;

  const PollData({
    required this.id,
    required this.question,
    required this.options,
    required this.totalVotes,
    this.myVotedOptionId,
    this.isClosed = false,
    this.endsAt,
  });
}

class PollWidget extends StatelessWidget {
  final PollData poll;
  final ValueChanged<String>? onVote;

  const PollWidget({
    super.key,
    required this.poll,
    this.onVote,
  });

  bool get _hasVoted => poll.myVotedOptionId != null;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.screenBg,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.poll_outlined, color: AppColors.brand, size: 18),
              const SizedBox(width: 6),
              const Text(
                'Trade Community Poll',
                style: TextStyle(
                  color: AppColors.brandDark,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
              const Spacer(),
              if (poll.isClosed)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'Final Results',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            poll.question,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.darkText,
            ),
          ),
          const SizedBox(height: 12),
          for (final opt in poll.options) _buildOptionRow(context, opt),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${poll.totalVotes} votes',
                style: const TextStyle(color: AppColors.midText, fontSize: 12),
              ),
              const Text(' • ', style: TextStyle(color: AppColors.midText)),
              Text(
                poll.isClosed ? 'Poll closed' : 'Vote to see results',
                style: const TextStyle(color: AppColors.midText, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOptionRow(BuildContext context, PollOptionData option) {
    final isSelected = poll.myVotedOptionId == option.id;
    final showResults = _hasVoted || poll.isClosed;

    if (!showResults) {
      // Interactive voting button
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            if (onVote != null) onVote!(option.id);
          },
          borderRadius: BorderRadius.circular(AppTheme.radius),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              option.label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.darkText,
              ),
            ),
          ),
        ),
      );
    }

    // Results with progress bar
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Stack(
        children: [
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius),
              border: Border.all(
                color: isSelected ? AppColors.brand : AppColors.border,
                width: isSelected ? 1.5 : 1.0,
              ),
            ),
          ),
          // Filled percentage
          FractionallySizedBox(
            widthFactor: (option.percentage / 100.0).clamp(0.0, 1.0),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.brand.withValues(alpha: 0.22)
                    : AppColors.borderLight,
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
            ),
          ),
          // Text label + percentage
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        option.label,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: AppColors.darkText,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.check_circle, size: 16, color: AppColors.brand),
                      ],
                    ],
                  ),
                ),
                Text(
                  '${option.percentage.toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? AppColors.brandDark : AppColors.midText,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
