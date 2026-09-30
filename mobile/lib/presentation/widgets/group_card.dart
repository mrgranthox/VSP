import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class GroupCard extends StatelessWidget {
  final String id;
  final String name;
  final String? description;
  final String privacy; // OPEN, CLOSED
  final int memberCount;
  final bool isMember;
  final String? coverImageUrl;
  final VoidCallback? onJoin;
  final VoidCallback? onTap;

  const GroupCard({
    super.key,
    required this.id,
    required this.name,
    this.description,
    this.privacy = 'OPEN',
    this.memberCount = 0,
    this.isMember = false,
    this.coverImageUrl,
    this.onJoin,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap ?? () => context.push('/groups/$id'),
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar / Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: Container(
                  width: 52,
                  height: 52,
                  color: AppColors.brandLight,
                  child: coverImageUrl != null && coverImageUrl!.isNotEmpty
                      ? Image.network(
                          coverImageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Center(
                            child: Icon(Icons.groups_outlined, color: AppColors.brand, size: 28),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.groups_outlined, color: AppColors.brand, size: 28),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.darkText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: privacy == 'OPEN' ? const Color(0xFFD1FAE5) : AppColors.screenBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            privacy,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: privacy == 'OPEN' ? const Color(0xFF065F46) : AppColors.midText,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (description != null && description!.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        description!,
                        style: const TextStyle(fontSize: 12, color: AppColors.midText),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          '$memberCount members',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.midText,
                          ),
                        ),
                        const Spacer(),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isMember ? Colors.white : AppColors.brand,
                            foregroundColor: isMember ? AppColors.brandDark : Colors.white,
                            elevation: 0,
                            side: isMember
                                ? const BorderSide(color: AppColors.brand, width: 1.2)
                                : BorderSide.none,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            ),
                          ),
                          onPressed: onJoin,
                          child: Text(
                            isMember ? 'Joined ✓' : 'Join Guild',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
