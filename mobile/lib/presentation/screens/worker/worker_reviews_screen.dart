import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/data/models/review_model.dart';
import 'package:vsp_mobile/data/repositories/reviews_repository.dart';
import 'package:vsp_mobile/presentation/providers/worker_provider.dart';
import 'package:vsp_mobile/presentation/widgets/avatar_badge.dart';

class WorkerReviewsScreen extends StatefulWidget {
  const WorkerReviewsScreen({super.key});

  @override
  State<WorkerReviewsScreen> createState() => _WorkerReviewsScreenState();
}

class _WorkerReviewsScreenState extends State<WorkerReviewsScreen> {
  bool _isLoading = true;
  List<Review> _reviews = [];

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    setState(() => _isLoading = true);
    final reviewsRepo = context.read<ReviewsRepository>();
    final workerProv = context.read<WorkerProvider>();

    try {
      final list = await reviewsRepo.getWorkerReviews(
        workerProv.profile?.id ?? 'worker-1',
      );
      _reviews = list;
    } catch (_) {}

    setState(() => _isLoading = false);
  }

  void _showReplyDialog(Review review) {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Reply to ${review.authorName}'),
        content: TextField(
          controller: textController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Thank the customer or address feedback...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Your response has been published!'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Publish Reply'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workerProv = context.watch<WorkerProvider>();
    final ratingAvg = workerProv.profile?.ratingAvg ?? 4.9;
    final totalCount = workerProv.profile?.reviewCount ?? 26;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Client Reviews & Ratings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Rating Overview Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Column(
                          children: [
                            Text(
                              ratingAvg.toStringAsFixed(1),
                              style: const TextStyle(
                                fontSize: 44,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Row(
                              children: List.generate(
                                5,
                                (i) => Icon(
                                  i < ratingAvg.floor()
                                      ? Icons.star_rounded
                                      : Icons.star_outline_rounded,
                                  color: AppColors.warning,
                                  size: 18,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$totalCount reviews',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          child: Column(
                            children: [
                              _buildRatingBar('5', 0.85),
                              _buildRatingBar('4', 0.10),
                              _buildRatingBar('3', 0.05),
                              _buildRatingBar('2', 0.0),
                              _buildRatingBar('1', 0.0),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  const Text(
                    'Customer Feedback',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (_reviews.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      child: const Text(
                        'No reviews yet. Complete your first booking to receive client feedback!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    )
                  else
                    ..._reviews.map((r) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                AvatarBadge(
                                  name: r.authorName,
                                  radius: 18,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        r.authorName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      Text(
                                        DateFormat.yMMMd().format(r.createdAt),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Row(
                                  children: List.generate(
                                    5,
                                    (i) => Icon(
                                      i < r.rating
                                          ? Icons.star_rounded
                                          : Icons.star_outline_rounded,
                                      color: AppColors.warning,
                                      size: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              r.comment,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton.icon(
                                onPressed: () => _showReplyDialog(r),
                                icon: const Icon(Icons.reply_rounded, size: 16),
                                label: const Text('Reply to Review',
                                    style: TextStyle(fontSize: 12)),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildRatingBar(String stars, double pct) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text('$stars ★',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          const SizedBox(width: 8),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 6,
                backgroundColor: Colors.grey.shade200,
                valueColor:
                    const AlwaysStoppedAnimation<Color>(AppColors.warning),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text('${(pct * 100).toInt()}%',
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
        ],
      ),
    );
  }
}
