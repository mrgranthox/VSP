import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class EventCard extends StatelessWidget {
  final String id;
  final String title;
  final String description;
  final String eventType; // IN_PERSON, ONLINE, HYBRID
  final String? location;
  final DateTime startAt;
  final int attendeeCount;
  final String? myRsvpStatus;
  final String? coverImageUrl;
  final String organizerName;
  final VoidCallback? onRsvp;
  final VoidCallback? onTap;

  const EventCard({
    super.key,
    required this.id,
    required this.title,
    required this.description,
    this.eventType = 'IN_PERSON',
    this.location,
    required this.startAt,
    this.attendeeCount = 0,
    this.myRsvpStatus,
    this.coverImageUrl,
    required this.organizerName,
    this.onRsvp,
    this.onTap,
  });

  bool get _isGoing => myRsvpStatus == 'GOING';

  @override
  Widget build(BuildContext context) {
    final monthStr = DateFormat.MMM().format(startAt).toUpperCase();
    final dayStr = DateFormat.d().format(startAt);
    final timeStr = DateFormat.jm().format(startAt);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
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
        onTap: onTap ?? () => context.push('/events/$id'),
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (coverImageUrl != null && coverImageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radius)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    coverImageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppColors.screenBg,
                      child: const Center(
                        child: Icon(Icons.event_outlined, size: 40, color: AppColors.brand),
                      ),
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Date calendar block
                  Container(
                    width: 48,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.brandLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.brand.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          monthStr,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppColors.brandDark,
                          ),
                        ),
                        Text(
                          dayStr,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: AppColors.darkText,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: eventType == 'ONLINE'
                                    ? const Color(0xFFD1FAE5)
                                    : AppColors.screenBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                eventType,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: eventType == 'ONLINE'
                                      ? const Color(0xFF065F46)
                                      : AppColors.midText,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              timeStr,
                              style: const TextStyle(fontSize: 11, color: AppColors.midText),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.darkText,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        if (location != null && location!.isNotEmpty)
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined, size: 13, color: AppColors.midText),
                              const SizedBox(width: 3),
                              Expanded(
                                child: Text(
                                  location!,
                                  style: const TextStyle(fontSize: 12, color: AppColors.midText),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.people_outline, size: 14, color: AppColors.brand),
                            const SizedBox(width: 4),
                            Text(
                              '$attendeeCount attending',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.brandDark,
                              ),
                            ),
                            const Spacer(),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _isGoing ? Colors.white : AppColors.brand,
                                foregroundColor: _isGoing ? AppColors.brandDark : Colors.white,
                                elevation: 0,
                                side: _isGoing
                                    ? const BorderSide(color: AppColors.brand, width: 1.2)
                                    : BorderSide.none,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                              ),
                              onPressed: onRsvp,
                              child: Text(
                                _isGoing ? 'Attending ✓' : 'RSVP',
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
          ],
        ),
      ),
    );
  }
}
