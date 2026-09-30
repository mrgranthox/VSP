import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class CompanyCard extends StatelessWidget {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String industry;
  final String? location;
  final int followerCount;
  final int employeeCount;
  final bool isFollowed;
  final bool isVerified;
  final VoidCallback? onFollow;
  final VoidCallback? onTap;

  const CompanyCard({
    super.key,
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    required this.industry,
    this.location,
    this.followerCount = 0,
    this.employeeCount = 0,
    this.isFollowed = false,
    this.isVerified = false,
    this.onFollow,
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
        onTap: onTap ?? () => context.push('/companies/$slug'),
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo
              ClipRRect(
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                child: Container(
                  width: 52,
                  height: 52,
                  color: AppColors.screenBg,
                  child: logoUrl != null && logoUrl!.isNotEmpty
                      ? Image.network(
                          logoUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Center(
                            child: Icon(Icons.business, color: AppColors.brand, size: 28),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.business, color: AppColors.brand, size: 28),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
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
                        if (isVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, size: 15, color: AppColors.brand),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      industry,
                      style: const TextStyle(fontSize: 12, color: AppColors.midText),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (location != null && location!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 12, color: AppColors.lightText),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              location!,
                              style: const TextStyle(fontSize: 11, color: AppColors.midText),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          '$followerCount followers',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.midText,
                          ),
                        ),
                        if (employeeCount > 0) ...[
                          const Text(' • ', style: TextStyle(color: AppColors.lightText)),
                          Text(
                            '$employeeCount workers',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.midText,
                            ),
                          ),
                        ],
                        const Spacer(),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isFollowed ? Colors.white : AppColors.brand,
                            foregroundColor: isFollowed ? AppColors.brandDark : Colors.white,
                            elevation: 0,
                            side: isFollowed
                                ? const BorderSide(color: AppColors.brand, width: 1.2)
                                : BorderSide.none,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            ),
                          ),
                          onPressed: onFollow,
                          child: Text(
                            isFollowed ? 'Following ✓' : '+ Follow',
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
