import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/booking_provider.dart';
import '../../widgets/booking_card.dart';
import '../../widgets/empty_state_view.dart';

class BookingsScreen extends StatelessWidget {
  const BookingsScreen({super.key});

  final List<String> _filters = const [
    'ALL',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ];

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<BookingProvider>();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('My Bookings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: SizedBox(
              height: 38,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                itemBuilder: (context, index) {
                  final status = _filters[index];
                  final isSelected = bookingProv.selectedStatus == status;

                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: isSelected,
                      label: Text(
                        status == 'ALL' ? 'All Jobs' : status.replaceAll('_', ' '),
                      ),
                      onSelected: (_) => bookingProv.setFilterStatus(status),
                      selectedColor: AppColors.brand,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isSelected ? Colors.white : AppColors.darkText,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                      side: BorderSide.none,
                    ),
                  );
                },
              ),
            ),
          ),

          // Bookings List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => bookingProv.loadBookings(),
              color: AppColors.brand,
              child: bookingProv.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : bookingProv.bookings.isEmpty
                      ? EmptyStateView(
                          icon: Icons.calendar_today_outlined,
                          title: 'No bookings found',
                          message:
                              'You have no ${bookingProv.selectedStatus.toLowerCase()} bookings.',
                          buttonText: 'Find Workers',
                          onButtonPressed: () => context.go('/search'),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: bookingProv.bookings.length,
                          itemBuilder: (context, index) {
                            final booking = bookingProv.bookings[index];
                            return BookingCard(
                              booking: booking,
                              onTap: () =>
                                  context.push('/booking/${booking.id}'),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
