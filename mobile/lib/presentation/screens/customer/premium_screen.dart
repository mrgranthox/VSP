import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../widgets/vsp_button.dart';

class PremiumScreen extends StatefulWidget {
  const PremiumScreen({super.key});

  @override
  State<PremiumScreen> createState() => _PremiumScreenState();
}

class _PremiumScreenState extends State<PremiumScreen> {
  int _selectedPlanIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('VSP Trades Premium', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              VspButton(
                text: 'Start 14-Day Free Trial',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🎉 Welcome to VSP Trades Premium! Your 14-day trial is now active.'),
                    ),
                  );
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 6),
              const Text(
                'Cancel anytime in your settings. No risk.',
                style: TextStyle(fontSize: 11, color: AppColors.midText),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Hero Badge
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFB45309), Color(0xFFF59E0B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(color: Color(0x33B45309), blurRadius: 10, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.workspace_premium, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Accelerate Your Trade Career',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            'Stand out to commercial clients and general contractors',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),

          // Plan Selection
          Row(
            children: [
              Expanded(
                child: _buildPlanCard(
                  index: 0,
                  title: 'Career Pro',
                  subtitle: 'For Skilled Tradespeople',
                  price: '\$19.99',
                  period: '/month',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildPlanCard(
                  index: 1,
                  title: 'Contractor Business',
                  subtitle: 'For Subcontractors & Firms',
                  price: '\$49.99',
                  period: '/month',
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Features List
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Included Premium Benefits',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                const SizedBox(height: 14),
                _buildBenefitRow(
                  icon: Icons.mark_email_unread_rounded,
                  title: 'Direct InMail to Any Client',
                  description: 'Reach property developers, architects, and procurement leads even before connecting.',
                ),
                _buildBenefitRow(
                  icon: Icons.visibility_rounded,
                  title: 'Unlimited Profile Viewer History',
                  description: 'See everyone who viewed your credentials over the last 90 days with analytics.',
                ),
                _buildBenefitRow(
                  icon: Icons.trending_up_rounded,
                  title: '3x Higher Search Visibility',
                  description: 'Top placement in contractor search queries and category directories.',
                ),
                _buildBenefitRow(
                  icon: Icons.verified_user_rounded,
                  title: 'Exclusive Gold Trade Badge',
                  description: 'Signify elite verification and master trade standards directly on your profile avatar.',
                ),
                _buildBenefitRow(
                  icon: Icons.insights_rounded,
                  title: 'Market Rate & Demand Insights',
                  description: 'Track prevailing hourly rates and high-demand vocational skills in your region.',
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPlanCard({
    required int index,
    required String title,
    required String subtitle,
    required String price,
    required String period,
  }) {
    final isSelected = _selectedPlanIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedPlanIndex = index),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.brand : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.brand.withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isSelected ? AppColors.brandDark : AppColors.darkText,
                  ),
                ),
                Icon(
                  isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: isSelected ? AppColors.brand : AppColors.midText,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.midText)),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(price, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Text(period, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBenefitRow({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.brandLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.brandDark, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 2),
                Text(description, style: const TextStyle(fontSize: 12, color: AppColors.midText, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
