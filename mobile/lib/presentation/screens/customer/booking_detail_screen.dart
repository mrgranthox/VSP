import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/avatar_badge.dart';
import '../../widgets/status_pill.dart';
import '../../widgets/vsp_button.dart';

class BookingDetailScreen extends StatelessWidget {
  final String bookingId;

  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();
    final matches = bookingProv.bookings.where((b) => b.id == bookingId);
    final booking = matches.isNotEmpty
        ? matches.first
        : Booking(
            id: bookingId,
            customerUserId: 'user-c1',
            workerProfileId: 'worker-1',
            workerName: 'Bob Williams',
            workerHeadline: 'Certified Master Electrician',
            tradeName: 'Electrician',
            status: 'CONFIRMED',
            scheduledStartTime: DateTime.now().add(const Duration(hours: 4)),
            totalAmountMinor: 15000,
            locationAddress: 'Airport Residential Area, Accra',
            createdAt: DateTime.now(),
          );

    final dateFormat = DateFormat('EEEE, MMMM d, yyyy · h:mm a');
    final formattedDate = dateFormat.format(booking.scheduledStartTime);

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Booking Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Ref #${booking.id.toUpperCase()}',
                        style: const TextStyle(
                          fontFamily: 'JetBrains Mono',
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.midText,
                        ),
                      ),
                      StatusPill(status: booking.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    booking.tradeName ?? 'Vocational Service',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.darkText,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    formattedDate,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.brand,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Worker Info Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Assigned Professional',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.midText,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      AvatarBadge(name: booking.workerName, size: 50),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              booking.workerName ?? 'Skilled Worker',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.darkText,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              booking.workerHeadline ?? 'Verified Tradesperson',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.midText,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.chat_bubble_outline, size: 16),
                          label: const Text('Message'),
                          onPressed: () =>
                              context.push('/chat/${booking.workerProfileId}'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.phone_outlined, size: 16),
                          label: const Text('Call'),
                          onPressed: () {},
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Location & Payment Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.location_on_outlined,
                          size: 18, color: AppColors.brand),
                      SizedBox(width: 8),
                      Text(
                        'Location',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.darkText,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    booking.locationAddress,
                    style: const TextStyle(fontSize: 13, color: AppColors.dark3),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Agreed Total Amount',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkText,
                        ),
                      ),
                      Text(
                        '${booking.currencyCode} ${booking.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: AppColors.brand,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Dynamic Action Button based on status
            if (booking.isCompleted) ...[
              VspButton(
                text: 'Leave a Review ⭐',
                width: double.infinity,
                variant: VspButtonVariant.accent,
                onPressed: () => context.push('/submit-review/${booking.id}'),
              ),
            ] else if (!booking.isCancelled) ...[
              VspButton(
                text: 'Mark Service Completed',
                width: double.infinity,
                onPressed: () async {
                  await bookingProv.completeBooking(booking.id);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: AppColors.success,
                        content: Text('Booking marked as completed!'),
                      ),
                    );
                  }
                },
              ),
              const SizedBox(height: 10),
              VspButton(
                text: 'Cancel Booking',
                width: double.infinity,
                variant: VspButtonVariant.danger,
                onPressed: () async {
                  await bookingProv.cancelBooking(booking.id, 'Client request');
                  if (context.mounted) context.pop();
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
