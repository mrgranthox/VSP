import 'package:flutter/material.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';

class WorkerAnalyticsScreen extends StatelessWidget {
  const WorkerAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings & Analytics'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Available Balance for Payout',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'GH₵ 2,850.00',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Payout Account: MTN MoMo (*8492)',
                        style: TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                  'Withdrawal request for GH₵ 2,850 queued to MTN MoMo.'),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primary,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: const Text('Withdraw',
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Monthly Earnings Bar Chart Simulation
            const Text(
              'Earnings History (Last 6 Months)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _buildMonthBar('May', 0.45, '1.8k'),
                      _buildMonthBar('Jun', 0.60, '2.4k'),
                      _buildMonthBar('Jul', 0.50, '2.0k'),
                      _buildMonthBar('Aug', 0.75, '3.0k'),
                      _buildMonthBar('Sep', 0.90, '3.6k'),
                      _buildMonthBar('Oct', 0.82, '3.4k', isCurrent: true),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Performance KPIs
            const Text(
              'Business Performance KPIs',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildKpiTile(
                    title: 'Total Completed',
                    value: '42 Jobs',
                    subtitle: 'Since joining',
                    icon: Icons.assignment_turned_in_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildKpiTile(
                    title: 'Repeat Clients',
                    value: '38%',
                    subtitle: 'High retention',
                    icon: Icons.repeat_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildKpiTile(
                    title: 'Avg. Job Value',
                    value: 'GH₵ 340',
                    subtitle: '+8% vs median',
                    icon: Icons.price_check_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildKpiTile(
                    title: 'Search Views',
                    value: '418',
                    subtitle: 'This week',
                    icon: Icons.visibility_outlined,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Payout Settings
            const Text(
              'Payout Accounts',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.amber.shade100,
                  child: const Icon(Icons.phone_android_rounded,
                      color: Colors.amber),
                ),
                title: const Text('MTN Mobile Money',
                    style:
                        TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                subtitle: const Text('024 •••• 8492 • Primary',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                trailing: TextButton(
                  onPressed: () {},
                  child: const Text('Edit'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthBar(String month, double fraction, String amount,
      {bool isCurrent = false}) {
    return Column(
      children: [
        Text(
          amount,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: isCurrent ? AppColors.primary : AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: 28,
          height: 120 * fraction,
          decoration: BoxDecoration(
            color: isCurrent ? AppColors.primary : AppColors.primaryLight,
            borderRadius: BorderRadius.circular(6),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          month,
          style: TextStyle(
            fontSize: 11,
            color: isCurrent ? AppColors.primary : AppColors.textSecondary,
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildKpiTile({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: AppColors.primary),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
