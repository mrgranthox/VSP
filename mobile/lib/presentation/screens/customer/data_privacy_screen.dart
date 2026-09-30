import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class DataPrivacyScreen extends StatefulWidget {
  const DataPrivacyScreen({super.key});

  @override
  State<DataPrivacyScreen> createState() => _DataPrivacyScreenState();
}

class _DataPrivacyScreenState extends State<DataPrivacyScreen> {
  bool _showPhone = false;
  bool _includeInRecruiterSearch = true;
  bool _displayGpsRadius = true;
  bool _readReceipts = true;
  String _messagingPermission = 'EVERYONE'; // 'EVERYONE', 'CONNECTIONS_ONLY', 'CONTRACTORS_ONLY'

  void _clearSearchHistory() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Search History?'),
        content: const Text('This will delete all your recent searches for trade pros, jobs, and companies.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Search history cleared.')),
              );
            },
            child: const Text('Clear', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _downloadDataArchive() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Preparing your VSP vocational data archive. We will email you a download link shortly.'),
      ),
    );
  }

  void _confirmCloseAccount() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close VSP Account?'),
        content: const Text(
          'Closing your account will permanently delete your vocational profile, skill endorsements, trade reviews, and client booking history. This action cannot be reversed.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep Account')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              context.go('/login');
            },
            child: const Text('Close Account', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Data Privacy & Settings',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Section 1: Profile Visibility
          _buildSectionHeader('PROFILE VISIBILITY'),
          Card(
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Include in Recruiter & Contractor Search',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Allows verified hiring managers and GC recruiters to discover your profile.',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  value: _includeInRecruiterSearch,
                  activeThumbColor: AppColors.success,
                  onChanged: (v) => setState(() => _includeInRecruiterSearch = v),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: const Text('Show Direct Phone Number on Profile',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Visible only to accepted 1st-degree connections and clients.',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  value: _showPhone,
                  activeThumbColor: AppColors.success,
                  onChanged: (v) => setState(() => _showPhone = v),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: const Text('Show Exact Service Radius',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Displays your operational coverage zones on trade map searches.',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  value: _displayGpsRadius,
                  activeThumbColor: AppColors.success,
                  onChanged: (v) => setState(() => _displayGpsRadius = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Section 2: Messaging & Communications
          _buildSectionHeader('COMMUNICATIONS & MESSAGING'),
          Card(
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                  child: const Text('Who can send you direct messages',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                ),
                RadioGroup<String>(
                  groupValue: _messagingPermission,
                  onChanged: (v) {
                    if (v != null) setState(() => _messagingPermission = v);
                  },
                  child: Column(
                    children: const [
                      RadioListTile<String>(
                        value: 'EVERYONE',
                        dense: true,
                        title: Text('Any VSP Member', style: TextStyle(fontSize: 13)),
                      ),
                      RadioListTile<String>(
                        value: 'CONNECTIONS_ONLY',
                        dense: true,
                        title: Text('1st & 2nd Degree Connections Only', style: TextStyle(fontSize: 13)),
                      ),
                      RadioListTile<String>(
                        value: 'CONTRACTORS_ONLY',
                        dense: true,
                        title: Text('Verified Contractors & Companies Only', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: const Text('Read Receipts & Live Typing Indicators',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Show when you have read messages and when you are typing in chat.',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  value: _readReceipts,
                  activeThumbColor: AppColors.brand,
                  onChanged: (v) => setState(() => _readReceipts = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Section 3: Data & Archives
          _buildSectionHeader('DATA ARCHIVES'),
          Card(
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.download_for_offline_outlined, color: AppColors.brand),
                  title: const Text('Download Personal Trade Archive',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Export JSON & PDF bundle of certifications, reviews, and logs',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: _downloadDataArchive,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.history, color: AppColors.midText),
                  title: const Text('Clear Search History',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Reset search recommendations and recent queries',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: _clearSearchHistory,
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.block, color: AppColors.midText),
                  title: const Text('Manage Blocked Accounts',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  trailing: const Icon(Icons.chevron_right, size: 20),
                  onTap: () => context.push('/customer/blocked'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Section 4: Account Actions
          _buildSectionHeader('ACCOUNT MANAGEMENT'),
          Card(
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radius),
              side: const BorderSide(color: AppColors.border),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.pause_circle_outline, color: AppColors.midText),
                  title: const Text('Hibernate Account Temporarily',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  subtitle: const Text('Take a break from VSP without losing your endorsements or history',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Account hibernation settings opened.')),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.delete_forever, color: AppColors.error),
                  title: const Text('Close & Delete Account',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.error)),
                  subtitle: const Text('Permanently erase account, credentials, and all trade data',
                      style: TextStyle(fontSize: 11, color: AppColors.midText)),
                  onTap: _confirmCloseAccount,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppColors.midText,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
