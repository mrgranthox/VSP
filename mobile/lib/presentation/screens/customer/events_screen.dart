import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> with SingleTickerProviderStateMixin {
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
    final provider = context.watch<LinkedInProvider>();
    final allEvents = provider.events;
    final attendingEvents = allEvents.where((e) => e.myRsvpStatus == 'GOING').toList();
    final onlineEvents = allEvents.where((e) => e.eventType == 'ONLINE').toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Trades Events & Masterclasses', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.brand,
          unselectedLabelColor: AppColors.midText,
          indicatorColor: AppColors.brand,
          tabs: [
            Tab(text: 'All (${allEvents.length})'),
            Tab(text: 'Attending (${attendingEvents.length})'),
            Tab(text: 'Online (${onlineEvents.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildEventsList(context, provider, allEvents),
          _buildEventsList(context, provider, attendingEvents),
          _buildEventsList(context, provider, onlineEvents),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/events/create'),
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Host Event', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _buildEventsList(BuildContext context, LinkedInProvider provider, List<dynamic> events) {
    if (events.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.event_busy_rounded, size: 48, color: AppColors.midText),
              SizedBox(height: 12),
              Text('No scheduled trade events found in this category.', style: TextStyle(color: AppColors.midText)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final ev = events[index];
        final monthStr = DateFormat('MMM').format(ev.startAt).toUpperCase();
        final dayStr = DateFormat('dd').format(ev.startAt);
        final timeStr = DateFormat('jm').format(ev.startAt);

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          elevation: 0.5,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
              provider.selectEvent(ev.id);
              context.push('/events/${ev.id}');
            },
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Date Box
                      Container(
                        width: 50,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.brandLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Text(
                              monthStr,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.brandDark,
                              ),
                            ),
                            Text(
                              dayStr,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: AppColors.brandDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Main info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: ev.eventType == 'ONLINE'
                                    ? const Color(0xFFEFF6FF)
                                    : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                ev.eventType,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: ev.eventType == 'ONLINE' ? AppColors.info : AppColors.warningDark,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              ev.title,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkText,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'By ${ev.organizerName}',
                              style: const TextStyle(fontSize: 12, color: AppColors.midText),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.access_time, size: 13, color: AppColors.lightText),
                                const SizedBox(width: 4),
                                Text(timeStr, style: const TextStyle(fontSize: 12, color: AppColors.lightText)),
                                const SizedBox(width: 12),
                                const Icon(Icons.people_outline, size: 13, color: AppColors.lightText),
                                const SizedBox(width: 4),
                                Text('${ev.attendeeCount} attending', style: const TextStyle(fontSize: 12, color: AppColors.lightText)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 10),

                  // RSVP Action Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ev.location ?? (ev.meetingUrl != null ? 'Online Meeting' : 'Location TBA'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.midText),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ev.myRsvpStatus == 'GOING' ? AppColors.success : AppColors.brand,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        onPressed: () {
                          final newStatus = ev.myRsvpStatus == 'GOING' ? 'NOT_GOING' : 'GOING';
                          provider.toggleRsvp(ev.id, newStatus);
                        },
                        child: Text(
                          ev.myRsvpStatus == 'GOING' ? '✓ Attending' : 'RSVP',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
