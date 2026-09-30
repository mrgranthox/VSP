import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/data/models/booking_model.dart';
import 'package:vsp_mobile/presentation/providers/booking_provider.dart';
import 'package:vsp_mobile/presentation/widgets/empty_state_view.dart';
import 'package:vsp_mobile/presentation/widgets/status_pill.dart';

class WorkerBookingsScreen extends StatefulWidget {
  const WorkerBookingsScreen({super.key});

  @override
  State<WorkerBookingsScreen> createState() => _WorkerBookingsScreenState();
}

class _WorkerBookingsScreenState extends State<WorkerBookingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<BookingProvider>();
    final bookings = bookingProvider.bookings;

    final upcoming = bookings
        .where((b) =>
            b.status.toUpperCase() == 'PENDING' ||
            b.status.toUpperCase() == 'CONFIRMED')
        .toList();

    final inProgress = bookings
        .where((b) => b.status.toUpperCase() == 'IN_PROGRESS')
        .toList();

    final completed = bookings
        .where((b) =>
            b.status.toUpperCase() == 'COMPLETED' ||
            b.status.toUpperCase() == 'CANCELLED')
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Booked Jobs'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: 'Upcoming (${upcoming.length})'),
            Tab(text: 'In Progress (${inProgress.length})'),
            Tab(text: 'Completed (${completed.length})'),
          ],
        ),
      ),
      body: bookingProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildBookingList(context, upcoming, bookingProvider),
                _buildBookingList(context, inProgress, bookingProvider),
                _buildBookingList(context, completed, bookingProvider),
              ],
            ),
    );
  }

  Widget _buildBookingList(
    BuildContext context,
    List<Booking> list,
    BookingProvider provider,
  ) {
    if (list.isEmpty) {
      return const EmptyStateView(
        title: 'No Bookings in this category',
        subtitle: 'Accepted client appointments will appear here.',
        icon: Icons.calendar_today_outlined,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final b = list[index];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  StatusPill(status: b.status),
                  Text(
                    b.priceFormatted,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                b.serviceTitle,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.person_outline_rounded,
                      size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    b.clientName,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.chat_bubble_outline_rounded,
                        size: 20, color: AppColors.primary),
                    onPressed: () => context.push('/customer/inbox'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.phone_outlined,
                        size: 20, color: AppColors.success),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Calling client...')),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.access_time_rounded,
                      size: 15, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Text(
                    b.formattedDate,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted),
                  ),
                  const SizedBox(width: 14),
                  const Icon(Icons.location_on_outlined,
                      size: 15, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  const Expanded(
                    child: Text(
                      'Accra, Ghana',
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textMuted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),

              // Action buttons according to workflow status
              if (b.status.toUpperCase() == 'CONFIRMED')
                ElevatedButton(
                  onPressed: () async {
                    await provider.updateBookingStatus(b.id, 'IN_PROGRESS');
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Job status updated to IN PROGRESS')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(42),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Start Job (On-Site)'),
                )
              else if (b.status.toUpperCase() == 'IN_PROGRESS')
                ElevatedButton(
                  onPressed: () async {
                    await provider.updateBookingStatus(b.id, 'COMPLETED');
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Job marked as COMPLETED!')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(42),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Mark Job Completed'),
                )
              else if (b.status.toUpperCase() == 'COMPLETED')
                OutlinedButton(
                  onPressed: () =>
                      context.push('/customer/bookings/${b.id}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(42),
                    side: BorderSide(color: Colors.grey.shade300),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('View Job Summary & Invoice'),
                ),
            ],
          ),
        );
      },
    );
  }
}
