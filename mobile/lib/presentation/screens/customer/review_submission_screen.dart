import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class ReviewSubmissionScreen extends StatefulWidget {
  final String bookingId;

  const ReviewSubmissionScreen({super.key, required this.bookingId});

  @override
  State<ReviewSubmissionScreen> createState() => _ReviewSubmissionScreenState();
}

class _ReviewSubmissionScreenState extends State<ReviewSubmissionScreen> {
  double _overallRating = 5.0;
  double _punctuality = 5.0;
  double _quality = 5.0;
  double _communication = 5.0;
  double _value = 5.0;

  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitReview() async {
    if (_commentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write a brief review comment')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => _isSubmitting = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Thank you! Your verified review has been published.'),
        ),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Leave a Review'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Center(
                child: Text(
                  'How was your experience?',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppColors.darkText,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              const Center(
                child: Text(
                  'Rate your tradesperson to help the community find reliable workers',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppColors.midText),
                ),
              ),
              const SizedBox(height: 20),

              // Overall Star Rating
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (index) {
                    final star = index + 1.0;
                    return IconButton(
                      iconSize: 38,
                      icon: Icon(
                        star <= _overallRating ? Icons.star : Icons.star_border,
                        color: const Color(0xFFF59E0B),
                      ),
                      onPressed: () {
                        setState(() {
                          _overallRating = star;
                        });
                      },
                    );
                  }),
                ),
              ),
              const SizedBox(height: 20),

              // Dimension Breakdown Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.screenBg,
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    _buildDimensionRow('Punctuality & Arrival', _punctuality, (v) {
                      setState(() => _punctuality = v);
                    }),
                    const Divider(height: 16),
                    _buildDimensionRow('Quality of Workmanship', _quality, (v) {
                      setState(() => _quality = v);
                    }),
                    const Divider(height: 16),
                    _buildDimensionRow('Communication & Clarity', _communication, (v) {
                      setState(() => _communication = v);
                    }),
                    const Divider(height: 16),
                    _buildDimensionRow('Value for Money', _value, (v) {
                      setState(() => _value = v);
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              VspTextField(
                controller: _commentController,
                label: 'Write Your Review',
                hintText: 'Share specifics about the service provided, cleanliness, and overall satisfaction...',
                maxLines: 4,
              ),
              const SizedBox(height: 24),

              VspButton(
                text: 'Publish Review',
                width: double.infinity,
                isLoading: _isSubmitting,
                onPressed: _submitReview,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDimensionRow(String label, double rating, ValueChanged<double> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (i) {
            final star = i + 1.0;
            return InkWell(
              onTap: () => onChanged(star),
              child: Padding(
                padding: const EdgeInsets.all(2),
                child: Icon(
                  star <= rating ? Icons.star : Icons.star_border,
                  size: 20,
                  color: const Color(0xFFF59E0B),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
