import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/vsp_button.dart';

class EventDetailScreen extends StatefulWidget {
  final String eventId;

  const EventDetailScreen({super.key, required this.eventId});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LinkedInProvider>().selectEvent(widget.eventId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final event = provider.currentEvent;

    if (event == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Event Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final dateStr = DateFormat('EEEE, MMMM d, y').format(event.startAt);
    final timeStr = DateFormat('jm').format(event.startAt);
    final isAttending = event.myRsvpStatus == 'GOING';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Trade Event', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            children: [
              Expanded(
                child: VspButton(
                  text: isAttending ? '✓ You are Attending' : 'RSVP for Event',
                  variant: isAttending ? VspButtonVariant.outline : VspButtonVariant.primary,
                  onPressed: () {
                    provider.toggleRsvp(event.id, isAttending ? 'NOT_GOING' : 'GOING');
                  },
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        children: [
          if (event.coverImageUrl != null)
            Image.network(
              event.coverImageUrl!,
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Event Type Tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: event.eventType == 'ONLINE' ? AppColors.infoLight : AppColors.warningLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${event.eventType} MASTERCLASS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: event.eventType == 'ONLINE' ? AppColors.info : AppColors.warningDark,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Title
                Text(
                  event.title,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                const SizedBox(height: 6),
                Text(
                  'Hosted by ${event.organizerName}',
                  style: const TextStyle(fontSize: 13, color: AppColors.midText),
                ),
                const Divider(height: 32),

                // Time & Location Details
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.brandLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.calendar_month, color: AppColors.brandDark),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(dateStr, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text('$timeStr (GMT)', style: const TextStyle(color: AppColors.midText, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.brandLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        event.eventType == 'ONLINE' ? Icons.videocam : Icons.location_on,
                        color: AppColors.brandDark,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            event.eventType == 'ONLINE' ? 'Virtual Video Stream' : 'Event Venue',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Text(
                            event.location ?? (event.meetingUrl ?? 'Details shared upon RSVP'),
                            style: const TextStyle(color: AppColors.midText, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 32),

                // Attendees metric
                Row(
                  children: [
                    const Icon(Icons.groups_rounded, color: AppColors.brand, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      '${event.attendeeCount} tradespeople have registered',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.darkText),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // About Event
                const Text(
                  'About this Event',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                const SizedBox(height: 10),
                Text(
                  event.description,
                  style: const TextStyle(fontSize: 14, height: 1.6, color: Color(0xFF374151)),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
