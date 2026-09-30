import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/linkedin_provider.dart';

class CreateEventScreen extends StatefulWidget {
  const CreateEventScreen({super.key});

  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleCtrl = TextEditingController();
  final TextEditingController _descCtrl = TextEditingController();
  final TextEditingController _locationCtrl = TextEditingController();
  final TextEditingController _meetingUrlCtrl = TextEditingController();
  final TextEditingController _coverUrlCtrl = TextEditingController();

  String _eventType = 'ONLINE'; // 'ONLINE' or 'IN_PERSON'
  DateTime _startDate = DateTime.now().add(const Duration(days: 3, hours: 2));
  TimeOfDay _startTime = const TimeOfDay(hour: 14, minute: 0);
  DateTime _endDate = DateTime.now().add(const Duration(days: 3, hours: 4));
  TimeOfDay _endTime = const TimeOfDay(hour: 16, minute: 0);
  bool _isPublishing = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    _meetingUrlCtrl.dispose();
    _coverUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate != null) {
      if (!mounted) return;
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: _startTime,
      );
      if (pickedTime != null) {
        setState(() {
          _startDate = pickedDate;
          _startTime = pickedTime;
        });
      }
    }
  }

  Future<void> _pickEndDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _endDate,
      firstDate: _startDate,
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (pickedDate != null) {
      if (!mounted) return;
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: _endTime,
      );
      if (pickedTime != null) {
        setState(() {
          _endDate = pickedDate;
          _endTime = pickedTime;
        });
      }
    }
  }

  Future<void> _handlePublish() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isPublishing = true);

    final startDateTime = DateTime(
      _startDate.year,
      _startDate.month,
      _startDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    final endDateTime = DateTime(
      _endDate.year,
      _endDate.month,
      _endDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    final success = await context.read<LinkedInProvider>().createEvent(
      title: _titleCtrl.text.trim(),
      description: _descCtrl.text.trim(),
      eventType: _eventType,
      startAt: startDateTime,
      endAt: endDateTime,
      location: _eventType == 'IN_PERSON' ? _locationCtrl.text.trim() : null,
      meetingUrl: _eventType == 'ONLINE' ? _meetingUrlCtrl.text.trim() : null,
      coverImageUrl: _coverUrlCtrl.text.trim().isNotEmpty ? _coverUrlCtrl.text.trim() : null,
    );

    if (!mounted) return;
    setState(() => _isPublishing = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trade event published successfully!')),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to publish event. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEE, MMM d, yyyy');

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create Trade Event',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _isPublishing ? null : _handlePublish,
              child: _isPublishing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Publish',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.brand),
                    ),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Event Type Toggle
              const Text('Event Format', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.videocam_outlined, size: 16),
                            SizedBox(width: 6),
                            Text('Online / Webinar'),
                          ],
                        ),
                      ),
                      selected: _eventType == 'ONLINE',
                      selectedColor: AppColors.brand,
                      labelStyle: TextStyle(
                        color: _eventType == 'ONLINE' ? Colors.white : AppColors.darkText,
                        fontWeight: FontWeight.w700,
                      ),
                      onSelected: (_) => setState(() => _eventType = 'ONLINE'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.location_on_outlined, size: 16),
                            SizedBox(width: 6),
                            Text('In-Person Workshop'),
                          ],
                        ),
                      ),
                      selected: _eventType == 'IN_PERSON',
                      selectedColor: AppColors.brand,
                      labelStyle: TextStyle(
                        color: _eventType == 'IN_PERSON' ? Colors.white : AppColors.darkText,
                        fontWeight: FontWeight.w700,
                      ),
                      onSelected: (_) => setState(() => _eventType = 'IN_PERSON'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Title
              const Text('Event Title', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _titleCtrl,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter an event title' : null,
                decoration: InputDecoration(
                  hintText: 'e.g. Commercial 480V Switchgear & ARC Flash Safety Expo',
                  hintStyle: const TextStyle(fontSize: 13),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Date & Times
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Starts', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickStartDate,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(AppTheme.radius),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(dateFormat.format(_startDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                Text(_startTime.format(context), style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Ends', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: _pickEndDate,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(AppTheme.radius),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(dateFormat.format(_endDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                Text(_endTime.format(context), style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Location or Meeting URL
              if (_eventType == 'IN_PERSON') ...[
                const Text('Location / Venue Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _locationCtrl,
                  validator: (v) => _eventType == 'IN_PERSON' && (v == null || v.trim().isEmpty)
                      ? 'Please enter workshop venue address'
                      : null,
                  decoration: InputDecoration(
                    hintText: 'e.g. Trade Guild Hall, 1024 Industrial Pkwy, Austin, TX',
                    hintStyle: const TextStyle(fontSize: 13),
                    prefixIcon: const Icon(Icons.location_on, size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ] else ...[
                const Text('Online Meeting / Webinar URL', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _meetingUrlCtrl,
                  validator: (v) => _eventType == 'ONLINE' && (v == null || v.trim().isEmpty)
                      ? 'Please enter meeting or webinar link'
                      : null,
                  decoration: InputDecoration(
                    hintText: 'e.g. https://vsp.trades.network/events/webinar-301',
                    hintStyle: const TextStyle(fontSize: 13),
                    prefixIcon: const Icon(Icons.link, size: 20),
                    filled: true,
                    fillColor: const Color(0xFFF9FAFB),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Description
              const Text('Description & Agenda', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descCtrl,
                maxLines: 5,
                validator: (v) => (v == null || v.trim().length < 20)
                    ? 'Please provide a detailed agenda (at least 20 characters)'
                    : null,
                decoration: InputDecoration(
                  hintText: 'Describe topics covered, required trade PPE, CEU credits awarded, and what attendees should bring...',
                  hintStyle: const TextStyle(fontSize: 13),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Cover Image URL
              const Text('Cover Image URL (Optional)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _coverUrlCtrl,
                decoration: InputDecoration(
                  hintText: 'https://images.unsplash.com/...',
                  hintStyle: const TextStyle(fontSize: 13),
                  prefixIcon: const Icon(Icons.image_outlined, size: 20),
                  filled: true,
                  fillColor: const Color(0xFFF9FAFB),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
