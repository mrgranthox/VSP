import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/linkedin_provider.dart';

class OpenToWorkScreen extends StatefulWidget {
  const OpenToWorkScreen({super.key});

  @override
  State<OpenToWorkScreen> createState() => _OpenToWorkScreenState();
}

class _OpenToWorkScreenState extends State<OpenToWorkScreen> {
  late bool _isOpen;
  final Set<String> _selectedJobTypes = {'Emergency Repairs', 'Contract Projects'};
  String _visibility = 'ALL'; // ALL, RECRUITERS_ONLY
  String _targetTitle = 'Master Electrician / MEP Technician';

  @override
  void initState() {
    super.initState();
    final linkedin = context.read<LinkedInProvider>();
    _isOpen = linkedin.isOpenToWork;
  }

  final List<String> _jobTypeOptions = [
    'Emergency Repairs',
    'Contract Projects',
    'Full-Time MEP Employment',
    'Commercial Sub-contracting',
    'Consulting / Site Inspection',
  ];

  @override
  Widget build(BuildContext context) {
    final linkedin = context.watch<LinkedInProvider>();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Open To Work Preferences', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      bottomNavigationBar: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brand,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
            ),
            onPressed: () {
              linkedin.toggleOpenToWork(_isOpen);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_isOpen
                      ? 'Updated: #OpenToWork badge is now live on your profile!'
                      : 'Updated: Availability status paused.'),
                ),
              );
              context.pop();
            },
            child: const Text('Save Preferences', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Master Switch Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Actively Open to Work & Requests',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _isOpen
                              ? 'Your profile displays the green #OpenToWork frame and appears in recruitment filters.'
                              : 'Turn this on to notify clients and contractors you are available.',
                          style: const TextStyle(fontSize: 12, color: AppColors.midText),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _isOpen,
                    activeThumbColor: AppColors.success,
                    onChanged: (val) => setState(() => _isOpen = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Job Title
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Target Trade Role Titles',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    initialValue: _targetTitle,
                    onChanged: (v) => _targetTitle = v,
                    decoration: InputDecoration(
                      hintText: 'e.g. Solar PV Installer, MEP Project Lead',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Preferred Contract Types
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Engagement Types',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  for (final opt in _jobTypeOptions)
                    CheckboxListTile(
                      value: _selectedJobTypes.contains(opt),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      title: Text(opt, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      activeColor: AppColors.brand,
                      onChanged: (checked) {
                        setState(() {
                          if (checked == true) {
                            _selectedJobTypes.add(opt);
                          } else {
                            _selectedJobTypes.remove(opt);
                          }
                        });
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Visibility
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppTheme.radius),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Who can see you are open',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  RadioGroup<String>(
                    groupValue: _visibility,
                    onChanged: (v) {
                      if (v != null) setState(() => _visibility = v);
                    },
                    child: Column(
                      children: const [
                        RadioListTile<String>(
                          value: 'ALL',
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text('All VSP Members (Shows #OpenToWork photo banner)',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          subtitle: Text('Includes any client, contractor, or visitor viewing your profile',
                              style: TextStyle(fontSize: 11)),
                        ),
                        RadioListTile<String>(
                          value: 'RECRUITERS_ONLY',
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text('Verified Contractors & Facility Managers Only',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          subtitle: Text('Hides banner from public profile, visible only in enterprise search',
                              style: TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
