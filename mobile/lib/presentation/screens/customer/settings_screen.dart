import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/presentation/providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pushNotifications = true;
  bool _emailAlerts = true;
  bool _smsAlerts = false;
  String _selectedLanguage = 'English';

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          // Section: Notifications
          _buildSectionHeader('NOTIFICATIONS'),
          SwitchListTile.adaptive(
            title: const Text('Push Notifications',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            subtitle: const Text('Instant updates on bookings and chats',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            activeTrackColor: AppColors.primary,
            value: _pushNotifications,
            onChanged: (val) => setState(() => _pushNotifications = val),
          ),
          SwitchListTile.adaptive(
            title: const Text('Email Alerts',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            subtitle: const Text('Weekly summaries and invoices',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            activeTrackColor: AppColors.primary,
            value: _emailAlerts,
            onChanged: (val) => setState(() => _emailAlerts = val),
          ),
          SwitchListTile.adaptive(
            title: const Text('SMS Updates',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            subtitle: const Text('Crucial booking confirmation SMS',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
            activeTrackColor: AppColors.primary,
            value: _smsAlerts,
            onChanged: (val) => setState(() => _smsAlerts = val),
          ),

          const Divider(height: 32),

          // Section: Preferences
          _buildSectionHeader('PREFERENCES'),
          ListTile(
            leading: const Icon(Icons.language_rounded,
                color: AppColors.textSecondary),
            title: const Text('Language',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: DropdownButton<String>(
              value: _selectedLanguage,
              underline: const SizedBox(),
              items: const [
                DropdownMenuItem(value: 'English', child: Text('English')),
                DropdownMenuItem(value: 'Twi', child: Text('Twi (Akan)')),
                DropdownMenuItem(value: 'Ga', child: Text('Ga')),
                DropdownMenuItem(value: 'Ewe', child: Text('Ewe')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _selectedLanguage = val);
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.palette_outlined,
                color: AppColors.textSecondary),
            title: const Text('Theme',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: const Text('System Default',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
            onTap: () {},
          ),

          const Divider(height: 32),

          // Section: Security
          _buildSectionHeader('SECURITY'),
          ListTile(
            leading: const Icon(Icons.lock_outline_rounded,
                color: AppColors.textSecondary),
            title: const Text('Change Password',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
            onTap: () => context.push('/forgot-password'),
          ),
          ListTile(
            leading: const Icon(Icons.security_rounded,
                color: AppColors.textSecondary),
            title: const Text('Two-Factor Authentication (2FA)',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.successSurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('Enabled',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.success)),
            ),
            onTap: () {},
          ),

          const Divider(height: 32),

          // Section: About & Legal
          _buildSectionHeader('ABOUT & LEGAL'),
          ListTile(
            leading: const Icon(Icons.description_outlined,
                color: AppColors.textSecondary),
            title: const Text('Terms of Service',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined,
                color: AppColors.textSecondary),
            title: const Text('Privacy Policy',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.info_outline_rounded,
                color: AppColors.textSecondary),
            title: const Text('App Version',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            trailing: const Text('v1.0.0 (Build 100)',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ),

          const Divider(height: 32),

          // Section: Account Actions
          _buildSectionHeader('ACCOUNT'),
          ListTile(
            leading:
                const Icon(Icons.logout_rounded, color: AppColors.warning),
            title: const Text('Log Out',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.warning)),
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Log Out'),
                  content: const Text(
                      'Are you sure you want to log out of your VSP account?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.error,
                      ),
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Log Out',
                          style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                await authProvider.logout();
                if (context.mounted) {
                  context.go('/login');
                }
              }
            },
          ),
          ListTile(
            leading:
                const Icon(Icons.delete_outline_rounded, color: AppColors.error),
            title: const Text('Delete Account',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.error)),
            subtitle: const Text('Permanently erase your data and profile',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                      'To delete your account, please contact compliance@vsp.app'),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}
