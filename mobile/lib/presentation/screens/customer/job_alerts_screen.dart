import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/job_alert_model.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class JobAlertsScreen extends StatefulWidget {
  const JobAlertsScreen({super.key});

  @override
  State<JobAlertsScreen> createState() => _JobAlertsScreenState();
}

class _JobAlertsScreenState extends State<JobAlertsScreen> {
  void _openCreateAlertDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final queryCtrl = TextEditingController();
    String category = 'Electrical';
    String frequency = 'DAILY';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Create Job Alert',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.darkText),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  VspTextField(
                    label: 'Alert Title',
                    hintText: 'e.g., Commercial Electrician in Accra',
                    controller: titleCtrl,
                  ),
                  const SizedBox(height: 14),
                  VspTextField(
                    label: 'Keywords / Search Terms',
                    hintText: 'e.g., Solar, 3-Phase, Inverters',
                    controller: queryCtrl,
                  ),
                  const SizedBox(height: 14),
                  const Text('Trade Category', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Electrical', child: Text('Electrical')),
                      DropdownMenuItem(value: 'Plumbing', child: Text('Plumbing')),
                      DropdownMenuItem(value: 'HVAC', child: Text('HVAC & Mechanical')),
                      DropdownMenuItem(value: 'Carpentry', child: Text('Carpentry')),
                      DropdownMenuItem(value: 'Welding', child: Text('Welding & Fabrication')),
                    ],
                    onChanged: (val) {
                      if (val != null) setModalState(() => category = val);
                    },
                  ),
                  const SizedBox(height: 14),
                  const Text('Notification Frequency', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      ChoiceChip(
                        label: const Text('Daily Digest'),
                        selected: frequency == 'DAILY',
                        onSelected: (_) => setModalState(() => frequency = 'DAILY'),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Weekly Digest'),
                        selected: frequency == 'WEEKLY',
                        onSelected: (_) => setModalState(() => frequency = 'WEEKLY'),
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Instant'),
                        selected: frequency == 'INSTANT',
                        onSelected: (_) => setModalState(() => frequency = 'INSTANT'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  VspButton(
                    text: 'Save Job Alert',
                    onPressed: () {
                      final title = titleCtrl.text.trim();
                      if (title.isEmpty) return;

                      final provider = context.read<LinkedInProvider>();
                      provider.createJobAlert(
                        JobAlertItem(
                          id: 'ja-${DateTime.now().millisecondsSinceEpoch}',
                          title: title,
                          query: queryCtrl.text.trim(),
                          tradeCategory: category,
                          frequency: frequency,
                          createdAt: DateTime.now(),
                        ),
                      );
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Job alert activated! You will receive matched opportunities.')),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final alerts = provider.jobAlerts;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Job Alerts & Saved Searches', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_alert_rounded),
        label: const Text('New Alert', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _openCreateAlertDialog(context),
      ),
      body: alerts.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.notifications_active_outlined, size: 56, color: AppColors.midText),
                    const SizedBox(height: 16),
                    const Text(
                      'No Job Alerts Set Yet',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.darkText),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Get notified automatically when high-value vocational client jobs matching your trade skills and location get posted.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.midText, height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    VspButton(
                      text: 'Create Your First Alert',
                      onPressed: () => _openCreateAlertDialog(context),
                    ),
                  ],
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: alerts.length,
              itemBuilder: (context, index) {
                final alert = alerts[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0.5,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: alert.isActive ? AppColors.brandLight : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            alert.isActive ? Icons.notifications_active : Icons.notifications_off,
                            color: alert.isActive ? AppColors.brandDark : AppColors.midText,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                alert.title,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.darkText),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${alert.tradeCategory ?? "All Trades"} • ${alert.frequency} Digest',
                                style: const TextStyle(fontSize: 12, color: AppColors.midText),
                              ),
                              if (alert.query != null && alert.query!.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  'Keywords: "${alert.query}"',
                                  style: const TextStyle(fontSize: 11, color: AppColors.lightText),
                                ),
                              ],
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 20),
                          onPressed: () => provider.deleteJobAlert(alert.id),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
