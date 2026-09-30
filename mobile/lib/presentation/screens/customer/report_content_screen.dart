import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class ReportContentScreen extends StatefulWidget {
  final String entityType; // 'post', 'comment', 'user', 'job', 'message'
  final String entityId;

  const ReportContentScreen({
    super.key,
    required this.entityType,
    required this.entityId,
  });

  @override
  State<ReportContentScreen> createState() => _ReportContentScreenState();
}

class _ReportContentScreenState extends State<ReportContentScreen> {
  String _selectedReason = 'SPAM';
  final TextEditingController _detailsCtrl = TextEditingController();
  bool _isSubmitting = false;
  bool _isSubmitted = false;

  final List<Map<String, String>> _reasons = [
    {
      'id': 'SPAM',
      'title': 'Spam or unsolicited promotion',
      'desc': 'Excessive promotional posts, duplicate listings, or affiliate spam',
    },
    {
      'id': 'FRAUD',
      'title': 'Fraud, scam, or fake trade credentials',
      'desc': 'Falsified trade licenses, contractor scams, or fraudulent estimates',
    },
    {
      'id': 'UNLICENSED_SAFETY',
      'title': 'Safety violation or unlicensed practice',
      'desc': 'Promotes hazardous unpermitted electrical, plumbing, or structural work',
    },
    {
      'id': 'HARASSMENT',
      'title': 'Harassment, hate speech, or bullying',
      'desc': 'Disparaging remarks, threats, intimidation, or hate speech',
    },
    {
      'id': 'INAPPROPRIATE',
      'title': 'Inappropriate or explicit content',
      'desc': 'Graphic content, nudity, violence, or profanity',
    },
    {
      'id': 'MISINFORMATION',
      'title': 'Building code or regulatory misinformation',
      'desc': 'False claims about municipal inspections, NEC, IPC, or OSHA rules',
    },
  ];

  @override
  void dispose() {
    _detailsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitReport() async {
    setState(() => _isSubmitting = true);

    // Simulate network report call
    await Future.delayed(const Duration(milliseconds: 700));

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
      _isSubmitted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isSubmitted) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.darkText,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_outline, color: AppColors.success, size: 40),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Report Submitted',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Thank you for reporting. Our moderation and trust team will review this content against VSP trade safety standards.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.midText, fontSize: 14),
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brand,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(200, 46),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Report ${widget.entityType.toUpperCase()}',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Why are you reporting this content?',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'Your report is confidential. The author will not be informed who submitted the report.',
              style: TextStyle(fontSize: 13, color: AppColors.midText),
            ),
            const SizedBox(height: 16),

            RadioGroup<String>(
              groupValue: _selectedReason,
              onChanged: (val) {
                if (val != null) setState(() => _selectedReason = val);
              },
              child: Column(
                children: _reasons.map((r) {
                  final isSelected = _selectedReason == r['id'];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: isSelected
                          ? AppColors.brandLight.withValues(alpha: 0.4)
                          : const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppTheme.radius),
                          border: Border.all(
                            color: isSelected ? AppColors.brand : AppColors.border,
                          ),
                        ),
                        child: RadioListTile<String>(
                          value: r['id']!,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                          dense: true,
                          title: Text(
                            r['title']!,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          subtitle: Text(
                            r['desc']!,
                            style: const TextStyle(fontSize: 11, color: AppColors.midText),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16),
            const Text(
              'Additional Details (Optional)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _detailsCtrl,
              maxLines: 3,
              maxLength: 300,
              decoration: InputDecoration(
                hintText: 'Provide any additional context for our trade moderation team...',
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                filled: true,
                fillColor: const Color(0xFFF9FAFB),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
                ),
                onPressed: _isSubmitting ? null : _submitReport,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text(
                        'Submit Report',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
