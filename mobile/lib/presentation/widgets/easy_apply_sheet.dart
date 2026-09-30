import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'vsp_button.dart';

/// LinkedIn-style 1-Tap Easy Apply Modal Bottom Sheet for VSP.
class EasyApplySheet extends StatefulWidget {
  final String jobId;
  final String jobTitle;
  final String companyOrPoster;
  final String? budget;
  final Future<void> Function(Map<String, dynamic> applicationData)? onSubmit;

  const EasyApplySheet({
    super.key,
    required this.jobId,
    required this.jobTitle,
    required this.companyOrPoster,
    this.budget,
    this.onSubmit,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String jobId,
    required String jobTitle,
    required String companyOrPoster,
    String? budget,
    Future<void> Function(Map<String, dynamic> applicationData)? onSubmit,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => EasyApplySheet(
        jobId: jobId,
        jobTitle: jobTitle,
        companyOrPoster: companyOrPoster,
        budget: budget,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  State<EasyApplySheet> createState() => _EasyApplySheetState();
}

class _EasyApplySheetState extends State<EasyApplySheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController(text: 'Kwame Mensah');
  final _emailCtrl = TextEditingController(text: 'kwame.mensah@gmail.com');
  final _phoneCtrl = TextEditingController(text: '+233 24 123 4567');
  final _noteCtrl = TextEditingController();

  String _experienceLevel = '3-5 years';
  bool _includeCertifications = true;
  bool _isSubmitting = false;

  final List<String> _experienceOptions = [
    '1-2 years',
    '3-5 years',
    '5-10 years',
    '10+ years (Master Tradesperson)',
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    HapticFeedback.mediumImpact();
    setState(() => _isSubmitting = true);

    try {
      final payload = {
        'jobId': widget.jobId,
        'jobTitle': widget.jobTitle,
        'fullName': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'experienceLevel': _experienceLevel,
        'includeCertifications': _includeCertifications,
        'coverNote': _noteCtrl.text.trim(),
        'submittedAt': DateTime.now().toIso8601String(),
      };

      if (widget.onSubmit != null) {
        await widget.onSubmit!(payload);
      } else {
        // Default simulated network delay
        await Future.delayed(const Duration(milliseconds: 600));
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.brand,
            behavior: SnackBarBehavior.floating,
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Application submitted for ${widget.jobTitle}!',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red.shade700,
            content: Text('Failed to submit application: $e'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radiusLg)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        margin: EdgeInsets.only(bottom: bottomInset),
        child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          const SizedBox(height: 10),
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.brandLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.bolt_rounded,
                    color: AppColors.brand,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Easy Apply',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppColors.brand,
                              letterSpacing: 0.5,
                            ),
                          ),
                          if (widget.budget != null) ...[
                            const SizedBox(width: 6),
                            Text(
                              '• ${widget.budget}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        widget.jobTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppColors.darkText,
                        ),
                      ),
                      Text(
                        widget.companyOrPoster,
                        style: TextStyle(
                          fontSize: 12,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 16),

          // Scrollable Application Form
          Flexible(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                shrinkWrap: true,
                children: [
                  // Section 1: Contact Information
                  _buildSectionHeader('1. Contact Information'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: _inputDecoration('Full Name', Icons.person_outline),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _inputDecoration('Email Address', Icons.email_outlined),
                    validator: (v) =>
                        (v == null || !v.contains('@')) ? 'Valid email required' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: _inputDecoration('Phone Number', Icons.phone_outlined),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Phone required' : null,
                  ),

                  const SizedBox(height: 20),

                  // Section 2: Experience & Qualifications
                  _buildSectionHeader('2. Experience & Trade Qualifications'),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _experienceLevel,
                    decoration: _inputDecoration('Trade Experience', Icons.history_edu),
                    items: _experienceOptions.map((exp) {
                      return DropdownMenuItem(value: exp, child: Text(exp));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _experienceLevel = val);
                    },
                  ),
                  const SizedBox(height: 10),

                  // Attached VSP Verified Resume Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.screenBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.picture_as_pdf, color: Colors.red.shade700, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'VSP_Trade_Profile_Resume.pdf',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.darkText,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Auto-generated from your verified skills & history',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.midText,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.check_circle_rounded, color: AppColors.brand, size: 20),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),
                  Material(
                    color: Colors.transparent,
                    child: CheckboxListTile(
                      value: _includeCertifications,
                      onChanged: (val) => setState(() => _includeCertifications = val ?? true),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: const Text(
                        'Attach verified trade licenses & insurance badges',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Section 3: Pitch / Note to Client
                  _buildSectionHeader('3. Message to Customer / Employer (Optional)'),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _noteCtrl,
                    maxLines: 3,
                    decoration: _inputDecoration(
                      'Add a note, quote estimate, or availability...',
                      Icons.chat_bubble_outline_rounded,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: VspButton(
                    text: 'Submit Application',
                    icon: Icons.send_rounded,
                    isLoading: _isSubmitting,
                    onPressed: _handleSubmit,
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

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        color: AppColors.darkText,
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 20, color: AppColors.midText),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppTheme.radius),
        borderSide: const BorderSide(color: AppColors.brand, width: 1.5),
      ),
    );
  }
}
