import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/presentation/providers/service_request_provider.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_button.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_text_field.dart';

class RequestResponseScreen extends StatefulWidget {
  final String requestId;

  const RequestResponseScreen({super.key, required this.requestId});

  @override
  State<RequestResponseScreen> createState() => _RequestResponseScreenState();
}

class _RequestResponseScreenState extends State<RequestResponseScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _durationController = TextEditingController(text: '3 hours');
  final TextEditingController _noteController = TextEditingController();
  DateTime _scheduledDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _scheduledTime = const TimeOfDay(hour: 9, minute: 0);
  bool _isSubmitting = false;

  @override
  void dispose() {
    _priceController.dispose();
    _durationController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _scheduledDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) {
      setState(() => _scheduledDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _scheduledTime,
    );
    if (picked != null) {
      setState(() => _scheduledTime = picked);
    }
  }

  Future<void> _handleSubmitQuote() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    // Simulate backend response transmission
    await Future.delayed(const Duration(milliseconds: 600));

    setState(() => _isSubmitting = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Quote submitted to client successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final reqProv = context.watch<ServiceRequestProvider>();
    final request = reqProv.myRequests.firstWhere(
      (r) => r.id == widget.requestId,
      orElse: () => reqProv.myRequests.first,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Send Formal Quote'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Client Job Summary Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Client Request Summary',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      request.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      request.description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (request.budgetMinor != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Client Target Budget: ${request.budgetFormatted}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),

              const Text(
                'Your Quotation Details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 16),

              // Proposed Price
              VspTextField(
                controller: _priceController,
                label: 'Proposed Total Price (GH₵)',
                hint: 'e.g. 280',
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.payments_outlined),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Enter your quote amount';
                  if (double.tryParse(val.trim()) == null) return 'Enter a valid number';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Estimated Duration
              VspTextField(
                controller: _durationController,
                label: 'Estimated Job Duration',
                hint: 'e.g. 2 - 3 hours',
                prefixIcon: const Icon(Icons.timer_outlined),
              ),
              const SizedBox(height: 16),

              // Date & Time Selection
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today_rounded, size: 16),
                      label: Text(
                        DateFormat.yMMMd().format(_scheduledDate),
                        style: const TextStyle(fontSize: 13),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickTime,
                      icon: const Icon(Icons.access_time_rounded, size: 16),
                      label: Text(
                        _scheduledTime.format(context),
                        style: const TextStyle(fontSize: 13),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Pitch Note to Customer
              VspTextField(
                controller: _noteController,
                label: 'Note to Client (Optional)',
                hint: 'Include warranty, parts coverage, or arrival confirmation details...',
                maxLines: 4,
              ),
              const SizedBox(height: 28),

              // Submit Button
              VspButton(
                text: 'Send Quote to Client',
                isLoading: _isSubmitting,
                onPressed: _handleSubmitQuote,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
