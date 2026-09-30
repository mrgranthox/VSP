import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/service_request_provider.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/status_pill.dart';

class ServiceRequestsScreen extends StatelessWidget {
  const ServiceRequestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final reqProv = context.watch<ServiceRequestProvider>();

    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Service Requests'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => reqProv.loadRequests(),
        color: AppColors.brand,
        child: reqProv.isLoading
            ? const Center(child: CircularProgressIndicator())
            : reqProv.requests.isEmpty
                ? EmptyStateView(
                    icon: Icons.assignment_outlined,
                    title: 'No requests submitted yet',
                    message:
                        'Post a service request to receive quotes from qualified trades.',
                    buttonText: 'Post a Request',
                    onButtonPressed: () => context.push('/create-request'),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    itemCount: reqProv.requests.length,
                    itemBuilder: (context, index) {
                      final req = reqProv.requests[index];

                      return Container(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 6),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                StatusPill(status: req.status),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.screenBg,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    req.urgency,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.midText,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              req.title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.darkText,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              req.description,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.midText,
                                height: 1.4,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.location_on_outlined,
                                        size: 14, color: AppColors.midText),
                                    const SizedBox(width: 4),
                                    Text(
                                      req.locationAddress,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.midText,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                                if (req.budget != null)
                                  Text(
                                    'GHS ${req.budget!.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.brand,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        onPressed: () => context.push('/create-request'),
        icon: const Icon(Icons.add),
        label: const Text('Post Request', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}
